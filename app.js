// app.js

(function () {
  let player = {
    name: "",
    rankIndex: 0,
    stats: {
      str: { lvl: 1, xp: 0 },
      spd: { lvl: 1, xp: 0 },
      flex: { lvl: 1, xp: 0 },
      end: { lvl: 1, xp: 0 }
    },
    workoutCount: 0,
    coins: 0,
    streak: 0,
    lastWorkoutDate: null,
    unlockedItems: [],
    activeAura: null,
    equippedRelic: null, // Reliquia equipada activa
    readingProgress: {}, // Progreso de lectura por libro { bookId: lastCfi }
    unlockedBadges: [],
    equippedBadges: [null, null, null],
    // 6.0 Extensions
    voiceEnabled: true,
    geminiKey: "",
    equipment: "none",
    injuries: [],
    lastWorkoutFeedback: ''
  };

  // 6.0 Core Global Hooks & Scopes
  let activeSetIndex = 0;
  let restInterval = null;
  let restSecondsLeft = 0;
  let wakeLock = null;
  let breathPhaseTimer = null;

  const BADGE_DB = [
    // --- Metas de Racha ---
    { id: 'b_streak_3', name: 'Llama Naciente', icon: '🔥', desc: 'Alcanza una racha de 3 días.', goal: (p) => p.streak >= 3 },
    { id: 'b_streak_7', name: 'Llama Eterna', icon: '🏮', desc: 'Alcanza una racha de 7 días.', goal: (p) => p.streak >= 7 },
    { id: 'b_streak_14', name: 'Corazón de Fénix', icon: '🦅', desc: 'Alcanza una racha inquebrantable de 14 días.', goal: (p) => p.streak >= 14 },
    { id: 'b_streak_30', name: 'Espíritu de Montaña', icon: '🗻', desc: 'Alcanza una racha sagrada de 30 días seguidos.', goal: (p) => p.streak >= 30 },

    // --- Metas de Nivel (Especialización) ---
    { id: 'b_lvl_5', name: 'Iniciado ZEN', icon: '🥋', desc: 'Alcanza el nivel 5 de fuerza o resistencia.', goal: (p) => p.stats.str.lvl >= 5 || p.stats.end.lvl >= 5 },
    { id: 'b_lvl_10', name: 'Guerrero de Élite', icon: '🗡️', desc: 'Alcanza el nivel 10 en cualquier estadística.', goal: (p) => Object.values(p.stats).some(s => s.lvl >= 10) },
    { id: 'b_lvl_30', name: 'Maestro Disciplinado', icon: '⚡', desc: 'Alcanza el nivel 30 en una disciplina singular.', goal: (p) => Object.values(p.stats).some(s => s.lvl >= 30) },
    { id: 'b_lvl_50', name: 'Cinturón Negro', icon: '⛩️', desc: 'Domina un atributo físico hasta el Nivel 50.', goal: (p) => Object.values(p.stats).some(s => s.lvl >= 50) },
    { id: 'b_lvl_100', name: 'Sensei Ascendido', icon: '🐉', desc: 'Corona el nivel 100 y conviértete en una Leyenda.', goal: (p) => Object.values(p.stats).some(s => s.lvl >= 100) },

    // --- Metas de Equilibrio ---
    { id: 'b_balance_15', name: 'El Camino del Loto', icon: '💠', desc: 'Lleva TODAS tus estadísticas base al Nivel 15.', goal: (p) => Object.values(p.stats).every(s => s.lvl >= 15) },

    // --- Metas de Esfuerzo Físico ---
    { id: 'b_first_blood', name: 'El Primer Paso', icon: '👣', desc: 'Completa tu primer entrenamiento.', goal: (p) => p.workoutCount >= 1 },
    { id: 'b_library', name: 'Científico del Dojo', icon: '🧠', desc: 'Realiza 10 entrenamientos totales terminados.', goal: (p) => p.workoutCount >= 10 },
    { id: 'b_library_50', name: 'Alma Curtída', icon: '🩸', desc: 'Rompe la barrera y registra 50 entrenamientos.', goal: (p) => p.workoutCount >= 50 },
    { id: 'b_library_100', name: 'Demonio Marcial', icon: '🦾', desc: 'Sobrevive impecablemente a 100 batallas y sesiones.', goal: (p) => p.workoutCount >= 100 },

    // --- Economía y Bazar ---
    { id: 'b_rich', name: 'Bolsillos de Oro', icon: '💰', desc: 'Acumula las preciadas 1,000 Monedas Zen.', goal: (p) => p.coins >= 1000 },
    { id: 'b_rich_5000', name: 'Templo de Abundancia', icon: '🪙', desc: 'Amasa fortuna letal poseyendo 5,000 Monedas Zen.', goal: (p) => p.coins >= 5000 },
    { id: 'b_rich_10000', name: 'Dragón de Oro', icon: '💎', desc: 'Leyenda del comercio: 10,000 Monedas Zen.', goal: (p) => p.coins >= 10000 },
    
    // --- Coleccionista ---
    { id: 'b_collector', name: 'Almacén del Dragón', icon: '🎒', desc: 'Desbloquea 5 objetos oscuros o reliquias de la tienda.', goal: (p) => (p.unlockedItems ? p.unlockedItems.length : 0) >= 5 },
    { id: 'b_collector_max', name: 'Curador del Templo', icon: '🏺', desc: 'Consigue 10 artefactos sagrados.', goal: (p) => (p.unlockedItems ? p.unlockedItems.length : 0) >= 10 },
    
    // --- Devoción Suprema ---
    { id: 'b_streak_100', name: 'Trascendencia', icon: '🌌', desc: 'Devoción irreal: Racha de 100 Días Seguidos.', goal: (p) => p.streak >= 100 }
  ];

  const STORE_ITEMS = [
    // ===== AURAS =====
    { id: 'aura_zafiro', type: 'aura', name: 'Aura Zafiro', desc: 'Remplaza el dorado del Dojo con un frío resplandor azul.', price: 500, icon: '🔵', meta: '#00ccff' },
    { id: 'aura_abismal', type: 'aura', name: 'Aura Abismal', desc: 'Sume el Dojo en una atmósfera de veneno oscuro.', price: 500, icon: '🟣', meta: '#aa00ff' },
    { id: 'aura_carmesi', type: 'aura', name: 'Aura Carmesí', desc: 'El color de la sangre guerrera tiñe cada rincón del Templo.', price: 600, icon: '🔴', meta: '#ff2244' },
    { id: 'aura_jade', type: 'aura', name: 'Aura Jade Imperial', desc: 'El verde sagrado de los emperadores antiguos envuelve el Dojo.', price: 700, icon: '🟢', meta: '#00cc66' },
    { id: 'aura_hielo', type: 'aura', name: 'Aura Escarcha Boreal', desc: 'Un frío glacial del norte ancestral recorre las paredes del Templo.', price: 750, icon: '🧊', meta: '#88ddff' },
    { id: 'aura_solar', type: 'aura', name: 'Aura Solar Divina', desc: 'La energía del sol naciente calcina toda oscuridad.', price: 800, icon: '☀️', meta: '#ff8800' },
    { id: 'aura_sombra', type: 'aura', name: 'Aura Sombra Eterna', desc: 'Solo los más dignos entrenan sumidos en la nada absoluta.', price: 1000, icon: '🌑', meta: '#555577' },
    { id: 'aura_sangre', type: 'aura', name: 'Aura Sangre de Dragón', desc: 'El ichor del último dragón resplandece en cada fibra del Dojo.', price: 1500, icon: '🐉', meta: '#cc0033' },

    // ===== MÚSICA =====
    { id: 'mus_taiko', type: 'music', name: 'Sinfonía Taiko', desc: 'Desbloquea tambores de guerra en la Emisora Astral.', price: 150, icon: '🥁', meta: 'audio-taiko' },
    { id: 'mus_synth', type: 'music', name: 'Cyber-Dojo Beat', desc: 'Desbloquea pulsos synthwave en la Emisora.', price: 150, icon: '🎹', meta: 'audio-synth' },
    { id: 'mus_ambient', type: 'music', name: 'Niebla del Templo', desc: 'Sonidos ambientales de un monasterio perdido entre montañas.', price: 200, icon: '🌫️', meta: 'audio-ambient' },
    { id: 'mus_epic', type: 'music', name: 'Crónica Épica', desc: 'Composición orquestal para tus entrenamientos más intensos.', price: 300, icon: '⚔️', meta: 'audio-epic' },
    { id: 'mus_lofi', type: 'music', name: 'Lo-fi del Guerrero', desc: 'Beats relajados para sesiones de estiramiento y recuperación.', price: 250, icon: '🎧', meta: 'audio-lofi' },
    { id: 'mus_tribal', type: 'music', name: 'Ritual Primordial', desc: 'Percusión tribal ancestral que despierta el instinto de combate.', price: 350, icon: '🪘', meta: 'audio-tribal' },

    // ===== BIBLIOTECA DE SABIDURÍA (EPUBs) =====
    { id: 'book_art_of_war', type: 'book', name: 'El Arte de la Guerra', desc: 'Sun Tzu. La maestría táctica del General Supremo.', price: 400, icon: '📖', meta: './books/arte_guerra.epub' },
    { id: 'book_meditations', type: 'book', name: 'Meditaciones', desc: 'Marco Aurelio. Las reflexiones del Emperador Filósofo.', price: 500, icon: '📖', meta: './books/meditaciones.epub' },
    { id: 'book_tao_te_ching', type: 'book', name: 'Tao Te Ching', desc: 'Lao Tzu. El camino del flujo y el silencio interior.', price: 300, icon: '📖', meta: './books/tao_te_ching.epub' },
    { id: 'book_enquiridion', type: 'book', name: 'Enquiridión', desc: 'Epicteto. El manual práctico de la resiliencia estoica.', price: 300, icon: '📖', meta: './books/enquiridion.epub' },
    { id: 'book_dhammapada', type: 'book', name: 'Dhammapada', desc: 'Buda. Sentencias y aforismos para la elevación mental.', price: 400, icon: '📖', meta: './books/dhammapada.epub' },
    { id: 'book_analectas', type: 'book', name: 'Las Analectas', desc: 'Confucio. Los diálogos y máximas de la sabiduría oriental.', price: 400, icon: '📖', meta: './books/analectas.epub' },

    // ===== RELIQUIAS =====
    { id: 'relic_oni', type: 'relic', name: 'Máscara Oni Destrozada', desc: 'Efecto pasivo: +15% XP en ejercicios de Fuerza (str).', price: 1000, icon: '👹', meta: '' },
    { id: 'relic_blade', type: 'relic', name: 'Hoja Ancestral Oxidada', desc: 'Efecto pasivo: +15% XP en ejercicios de Resistencia (end).', price: 1000, icon: '🗡️', meta: '' },
    { id: 'relic_scroll', type: 'relic', name: 'Pergamino del Fundador', desc: 'Efecto pasivo: El Oráculo te prescribe 1 serie extra por ejercicio.', price: 1200, icon: '📋', meta: '' },
    { id: 'relic_magatama', type: 'relic', name: 'Magatama del Abismo', desc: 'Efecto pasivo: +25% de monedas en cada sesión completada.', price: 1500, icon: '🌀', meta: '' },
    { id: 'relic_incense', type: 'relic', name: 'Incienso del Templo Perdido', desc: 'Efecto pasivo: El multiplicador de racha se duplica.', price: 800, icon: '🕯️', meta: '' },
    { id: 'relic_fang', type: 'relic', name: 'Colmillo del Primer Dragón', desc: 'Salvaguarda de racha: Protege tu racha diaria si fallas un día.', price: 2000, icon: '🦷', meta: '' },
    { id: 'relic_crown', type: 'relic', name: 'Corona del Monarca Caído', desc: 'Efecto pasivo: +20% global a toda ganancia de XP y Monedas.', price: 2500, icon: '👑', meta: '' }
  ];

  let workoutHistory = [];

  const STAT_LABELS = {
    str: 'FUERZA',
    spd: 'VELOCIDAD',
    flex: 'FLEXIBILIDAD',
    end: 'RESISTENCIA'
  };

  let _ritualCount = 0;
  let _ritualTimer = null;
  window.handleAvatarRitual = function() {
    clearTimeout(_ritualTimer);
    _ritualCount++;
    if (_ritualCount >= 7) {
      window.cheatWealth();
      _ritualCount = 0;
    } else {
      _ritualTimer = setTimeout(() => { _ritualCount = 0; }, 2000);
    }
  };

  window.cheatWealth = function () {
    player.coins += 10000;
    savePlayer();
    updateUI();
    // Notificación sutil solo para el desarrollador
    console.log("ZenRyu: Bendición del Maestro activada (+10,000)");
    showNotification("Bendición de Prosperidad activada.", "Sincronización");
  };

  window.debugSystem = function () {
    window.showConfirm(
      "El sistema buscará la versión más reciente del Códice y reiniciará la app para aplicarla. Tu progreso no sufrirá cambios. ¿Proceder?",
      "⛩️ Sincronizar Códice",
      () => {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then(registrations => {
            for (let registration of registrations) { registration.unregister(); }
          });
        }
        if (window.caches) {
          caches.keys().then(names => {
            for (let name of names) caches.delete(name);
          });
        }
        location.replace(location.origin + location.pathname + '?v=' + Date.now());
      }
    );
  };

  window.sessionState = {
    active: false,
    gainedXP: { str: 0, spd: 0, flex: 0, end: 0 },
    levelUps: [],
    rankUpReady: false,
    reachedCap: false
  };

  // --- NATIVE INDEXEDDB WRAPPER ---
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
        req.onsuccess = (e) => {
          this.db = e.target.result;
          resolve(this.db);
        };
        req.onerror = (e) => reject(e);
      });
    },
    addHistory: function (entry, specificDate) {
      return new Promise((resolve, reject) => {
        if (!this.db) return resolve();
        let tx = this.db.transaction("history", "readwrite");
        let store = tx.objectStore("history");
        // entry can be a full {date,type} object or a legacy routineObj string
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

  window.exportSave = async function () {
    let dbHistory = [];
    try { dbHistory = await zendb.getAllHistory(); } catch (e) { }
    const saveData = { player: player, history: dbHistory, exportDate: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(saveData)], { type: "application/json" });
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

  window.importSave = function (event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function (e) {
      try {
        const data = JSON.parse(e.target.result);
        if (data.player && typeof data.player === 'object') {
          localStorage.setItem("zenWarriorPwaSave", JSON.stringify(data.player));
          if (data.history && data.history.length > 0) {
            await zendb.init().catch(e => { });
            await zendb.clearHistory();
            for (let r of data.history) {
              // Support both new {date,type} and old {date,routine} formats
              await zendb.addHistory({ date: r.date, type: r.type || 'Entrenamiento' });
            }
          }
          showNotification("Perfil restituido de forma segura. La academia se reiniciará para cargar tus habilidades.", "⛩️ Importación de Perfil", () => {
            location.reload();
          });
        } else {
          showNotification("Archivo no válido para Zen Ryu Sensei.", "❌ Error de Códice");
        }
      } catch (err) {
        showNotification("Error leyendo el archivo de perfil.", "❌ Error de Códice");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }


  const rankTitles = [
    {
      max: 4, title: "Letargo Mortal", icon: "🌑", color: "#8B7355",
      wisdom: "Todo gran viaje comienza con un cuerpo en reposo que decide despertar.",
      lore: "Estás en el umbral del despertar. Aún no has soltado tus cadenas, pero en tu interior duerme el código de la ascensión. El primer paso no es el más difícil — es reconocer el peso del letargo y decidir destruirlo. El dojo de sombras te espera."
    },
    {
      max: 9, title: "Iniciado del Camino", icon: "⛩️", color: "#4CAF50",
      wisdom: "El umbral se cruza una sola vez. No hay vuelta atrás.",
      lore: "Has roto la cáscara de la inercia. Eres un iniciado recién llegado a la forja. Tras cruzar la puerta oscura, tus semanas son de adaptación dolorosa. Cada fibra rasgada construye cimientos invisibles que sostendrán el templo viviente en el que te convertirás."
    },
    {
      max: 19, title: "Fuerza Latente", icon: "🩸", color: "#90A4AE",
      wisdom: "El equilibrio mecánico ya no es accidente. Es una elección consciente.",
      lore: "Has asimilado el sufrimiento entrenando en gravedad. Tu voluntad ahora dirige un cuerpo que resuena con la tensión estática. Estás descubriendo la diferencia brutal, cruda y profunda entre un esfuerzo desesperado y una potencia pura y calculada."
    },
    {
      max: 29, title: "Cazador de Sombras", icon: "🥷", color: "#FF8C00",
      wisdom: "La agresión descontrolada solo agota; la paciencia afila la cuchilla.",
      lore: "Has despertado una ferocidad letal y controlada. Las sombras no te asustan porque ya cazas en ellas. Cada repetición es perfecta, y el fracaso no se comete por falta de esfuerzo, sino al acercarte cada vez más a tus verdaderos límites insondables."
    },
    {
      max: 39, title: "Acero Vivo", icon: "⛓️", color: "#66BB6A",
      wisdom: "Un golpe perfecto, forjado en repetición, destruye mil movimientos ciegos.",
      lore: "Tus tendones resuenan con la densidad del metal irrompible. Has asimilado la economía absoluta: ningún músculo se acciona por error, ni siquiera una respiración se da por sentada. Tu cuerpo ya se desplaza como un instrumento implacable forjado en hierro y obsidiana."
    },
    {
      max: 49, title: "Guerrero Templado", icon: "⚔️", color: "#26A69A",
      wisdom: "Un verdadero filo no es el que nunca sufre, sino el que mantiene su borde en la masacre.",
      lore: "El sendero te ha puesto contra la pared innumerables veces. Has ganado el derecho a ser aclamado como un combatiente firme. Esta disciplina se arraigó hasta tu naturaleza, curtiéndote. Acostumbrado a los golpes, ya no te derrumbas; asimilas, analizas y aplastas."
    },
    {
      max: 59, title: "Sombra del Viento", icon: "🌪️", color: "#7E57C2",
      wisdom: "No colisiones inútilmente contra la fuerza invisible. Usa su furia.",
      lore: "Te desplazas con cinética letal, donde el comando físico ocurre en un instante microsegundos antes de la orden consciente. Eres una entidad biomecánica de reflejo letal; el mundo a tu alrededor entrena en una dimensión donde el ego desaparece por la rapidez letal."
    },
    {
      max: 69, title: "Voz del Vacío", icon: "🌌", color: "#78909C",
      wisdom: "La potencia definitiva grita menos pero rompe con gravedad cósmica.",
      lore: "Dejaste atrás las diletantes quejas. Entrenas inmerso en el éter abismal. La inmensa comprensión física se ha callado en tu interior porque ha depurado cualquier ego. Para cruzar este vacío se exige el desapego radical —entrenas no porque debas o temas, sino porque ahora eres eso."
    },
    {
      max: 79, title: "Alma de Titanio", icon: "🛡️", color: "#B0BEC5",
      wisdom: "La armadura del guerrero maduro es la inquebrantable mente que la habita.",
      lore: "La percepción de dolor se ha destilado en pura retroalimentación sensorial. Formaste armaduras nerviosas de pura resiliencia táctica. Sólido y absoluto ante las cargas, tu espíritu y materia se consolidan; el titanio es fuerte pero letal por la flexibilidad."
    },
    {
      max: 89, title: "Oráculo Marcial", icon: "👁️‍🗨️", color: "#5C6BC0",
      wisdom: "La lectura de las limitantes es la destreza final de la fuerza desatada.",
      lore: "Encuentras la iluminación prediciendo cómo fallará el cuerpo para anular dichos quiebres. La biomecánica no te oculta nada. Habitas y experimentas el poder predictivo para someter por instinto innegable cualquier obstáculo de progresión."
    },
    {
      max: 99, title: "Monarca del Abismo", icon: "👹", color: "#E53935",
      wisdom: "Aquel capaz de asomarse a las profundidades dominará la oscuridad del agotamiento.",
      lore: "Ya muy pocos habitan este escalafón místico de exigencia atroz en el borde humano. Eres considerado un monstruo disciplinario, que se eleva destruyendo complacencias del ego, un auténtico rey en la oscura planicie del condicionamiento solitario."
    },
    {
      max: 999, title: "Dragón Ascendido", icon: "🐉", color: "#FFD700",
      wisdom: "No existen cimas tras asimilar el absoluto. La entidad divina es el esfuerzo transmutado.",
      lore: "Frontera suprimida. Encarnas silenciosamente la brutal perfección abstracta. Alquimia lograda; la cúspide evolutiva ya no es medible porque trascendiste cada escalón por una brutal tenacidad constante. El dragón contempla sereno sin más contrincante que la inmensidad."
    }
  ];

  let currentRoutine = [];

  function getCurrentRank() {
    return rankTitles[player.rankIndex] || rankTitles[rankTitles.length - 1];
  }

  function savePlayer() {
    localStorage.setItem("zenWarriorPwaSave", JSON.stringify(player));
    // NOTE: workoutHistory is persisted exclusively in IndexedDB now.
    // Do NOT write it to localStorage to avoid duplicate migration on every reload.
  }

  async function loadPlayer() {
    await zendb.init().catch(e => console.log("IDB skipped"));

    let oldHx = localStorage.getItem("zenWarriorHistory");
    if (oldHx) {
      try {
        let parsedHx = JSON.parse(oldHx);
        for (let h of parsedHx) {
          // Old format: {date, type}  — preserve both fields
          await zendb.addHistory({ date: h.date, type: h.type || 'Entrenamiento' });
        }
        localStorage.removeItem("zenWarriorHistory");
      } catch (e) { }
    }
    try { workoutHistory = await zendb.getAllHistory(); } catch (e) { }

    let saved = localStorage.getItem("zenWarriorPwaSave");
    if (saved) {
      let savedPlayer = JSON.parse(saved);
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
        player = Object.assign(player, savedPlayer);
      }
      
      // Asegurar que todos los atributos existan defensivamente
      if (!player.stats) {
        player.stats = { 
          str: { lvl: 1, xp: 0 }, 
          spd: { lvl: 1, xp: 0 }, 
          flex: { lvl: 1, xp: 0 }, 
          end: { lvl: 1, xp: 0 } 
        };
      } else {
        ['str', 'spd', 'flex', 'end'].forEach(s => {
          if (!player.stats[s]) player.stats[s] = { lvl: 1, xp: 0 };
          if (typeof player.stats[s].lvl === 'undefined' || player.stats[s].lvl === null) player.stats[s].lvl = 1;
          if (typeof player.stats[s].xp === 'undefined' || player.stats[s].xp === null) player.stats[s].xp = 0;
        });
      }
      if (typeof player.workoutCount === 'undefined') player.workoutCount = 0;
      if (typeof player.coins === 'undefined') player.coins = 0;
      if (typeof player.streak === 'undefined') player.streak = 0;
      if (typeof player.lastWorkoutDate === 'undefined') player.lastWorkoutDate = null;
      if (!player.unlockedItems) player.unlockedItems = [];
      if (!player.activeAura) player.activeAura = null;
      if (!player.unlockedBadges) player.unlockedBadges = [];
      if (!player.equippedBadges) player.equippedBadges = [null, null, null];
      
      // 6.0 Defaults
      if (typeof player.voiceEnabled === 'undefined') player.voiceEnabled = true;
      if (typeof player.geminiKey === 'undefined') player.geminiKey = "";
      if (typeof player.equipment === 'undefined') player.equipment = "none";
      if (typeof player.injuries === 'undefined') player.injuries = [];
      if (typeof player.lastWorkoutFeedback === 'undefined') player.lastWorkoutFeedback = '';
      if (typeof player.savedVoiceURI === 'undefined') player.savedVoiceURI = "";
      if (typeof player.voicePitch === 'undefined') player.voicePitch = 1.0;
      if (typeof player.voiceRate === 'undefined') player.voiceRate = 0.95;

      // Update PWA configs UI
      const voiceToggle = document.getElementById('voice-toggle');
      if (voiceToggle) voiceToggle.checked = player.voiceEnabled;
      // Show/hide voice selector based on saved preference
      const voiceSelectorEl = document.getElementById('voice-selector-container');
      if (voiceSelectorEl) voiceSelectorEl.style.display = player.voiceEnabled ? 'block' : 'none';

      // Update Sliders UI on load
      const pitchSlider = document.getElementById('voice-pitch-slider');
      const pitchVal = document.getElementById('voice-pitch-val');
      if (pitchSlider) {
        pitchSlider.value = player.voicePitch;
        if (pitchVal) pitchVal.textContent = player.voicePitch.toFixed(2);
      }

      const rateSlider = document.getElementById('voice-rate-slider');
      const rateVal = document.getElementById('voice-rate-val');
      if (rateSlider) {
        rateSlider.value = player.voiceRate;
        if (rateVal) rateVal.textContent = player.voiceRate.toFixed(2);
      }



      // Populate voice dropdown — voices may load asynchronously (especially Chrome)
      if (window.speechSynthesis) {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          setTimeout(_populateVoiceSelector, 100);
        } else {
          // Chrome: voices not ready yet — use voiceschanged (already wired below)
          // Fallback: try again in 1s as safety net
          setTimeout(() => {
            if (window.speechSynthesis.getVoices().length > 0) _populateVoiceSelector();
          }, 1000);
        }
      }
      const gKeyInput = document.getElementById('gemini-key');
      if (gKeyInput) gKeyInput.value = player.geminiKey;
      setTimeout(() => { window.updateGeminiStatusBadge && window.updateGeminiStatusBadge(); }, 200);

      document.getElementById('onboarding-wizard').classList.add('hide');
      applyInventory();
      checkBadges();
      updateBadgesUI();
      updateUI();
      updateCodexUI();
      updateLibraryUI();
    } else {
      document.getElementById('onboarding-wizard').classList.remove('hide');
      document.getElementById('step-1').className = 'wizard-step active-step';
    }
  }

  // PWA INSTALL LOGIC (UNIVERSAL)
  const isStandalone = () => ('standalone' in window.navigator && window.navigator.standalone) || window.matchMedia('(display-mode: standalone)').matches;

  let deferredPrompt = null;

  // Capturamos el evento de Android para el 1-clic
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
  });

  window.addEventListener('load', () => {
    // EPUB.js Error/Rejection Isolation
    window.addEventListener('unhandledrejection', function (event) {
      const reason = event.reason;
      if (reason && (
        (reason.stack && reason.stack.includes('epub')) ||
        (reason.message && reason.message.includes('epub')) ||
        (reason.message && reason.message.includes('rendition')) ||
        (reason.message && reason.message.includes('ReadingSystem'))
      )) {
        console.warn("ZenRyu: Isolated unhandled rejection from epub.js:", reason);
        event.preventDefault();
      }
    });

    const originalOnError = window.onerror;
    window.onerror = function (message, source, lineno, colno, error) {
      if (source && (source.includes('epub') || source.includes('jszip'))) {
        console.warn("ZenRyu: Isolated global error from epub.js/jszip:", message, "at", source);
        return true;
      }
      if (originalOnError) return originalOnError.apply(this, arguments);
      return false;
    };

    let btnInstall = document.getElementById('btn-install-pwa');
    let gate = document.getElementById('install-gate');

    const isIOS = () => {
      return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    };

    // Siempre lo mostramos si NO estamos en la app instalada (standalone)
    if (btnInstall && gate && !isStandalone()) {
      gate.style.display = 'flex';

      btnInstall.addEventListener('click', async () => {
        if (navigator.vibrate) navigator.vibrate(50);

        if (deferredPrompt) {
          // Si Android/Chrome nos dio el prompt nativo, lo usamos (1-clic)
          deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          if (outcome === 'accepted') {
            gate.style.display = 'none';
          }
          deferredPrompt = null;
        } else if (isIOS()) {
          // Si es iOS, mostramos la ventana elegante específica
          openModal('ios-install-modal');
        } else {
          // Caso general (Android sin prompt nativo o PC)
          openModal('pwa-modal');
        }
      });
    }
  });

  function switchView(viewToShow, viewToHide) {
    console.log(`ZenRyu: switchView ${viewToHide} -> ${viewToShow}`);
    if (window.UISoundEngine) window.UISoundEngine.playSwoosh();
    const hideEl = document.getElementById(viewToHide);
    const showEl = document.getElementById(viewToShow);

    if (!hideEl || !showEl) {
      console.warn("ZenRyu: View transition failed, one or more elements missing.", { viewToShow, viewToHide });
      if (showEl) showEl.className = 'active-view';
      return;
    }

    // 1st rAF: aplica hidden-view y permite al browser hacer flush del layout
    hideEl.className = 'hidden-view';
    // 2nd rAF (doble): espera al siguiente frame de pintura REAL antes de animar
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        showEl.className = 'active-view';
      });
    });
  }

  // SOUNDS & NOTIFICATIONS
  window.playSysSound = function () {
    if (window.UISoundEngine) window.UISoundEngine.playClick();
  };

  window.playCompleteSound = function () {
    if (window.UISoundEngine) window.UISoundEngine.playSwoosh();
  };

  // ONBOARDING WIZARD
  window.nextWizardStep = function (currentStep) {
    console.log(`ZenRyu: nextWizardStep ${currentStep}`);
    let inputsCheck = {
      1: 'ob-name',
      2: 'ob-str',
      3: 'ob-spd',
      4: 'ob-legs',
      5: 'ob-end'
    };

    let el = document.getElementById(inputsCheck[currentStep]);
    if (el && el.value.trim() === '') {
      showNotification("Por honor, no dejes campos en blanco.", "Aviso");
      return;
    }

    const currentEl = document.getElementById('step-' + currentStep);
    const nextEl = document.getElementById('step-' + (currentStep + 1));

    if (currentEl && nextEl) {
      currentEl.classList.remove('active-step');
      currentEl.classList.add('hidden-step');
      nextEl.classList.remove('hidden-step');
      nextEl.classList.add('active-step');
    }
  }

  window.finishWizard = function () {
    let obName = document.getElementById('ob-name').value.trim();
    if (obName === '') {
      showNotification("Por honor, no dejes tu nombre en blanco.", "Aviso");
      return;
    }

    player.name = obName;
    
    // Obtener inputs del nuevo onboarding
    let exp = document.getElementById('ob-exp').value;
    let equip = document.getElementById('ob-equip').value;
    let push = document.getElementById('ob-str-push').value;
    let pull = document.getElementById('ob-str-pull').value;
    let coreVal = parseInt(document.getElementById('ob-core').value) || 1;
    let flexVal = parseInt(document.getElementById('ob-flex').value) || 1;
    
    let injuries = [];
    document.querySelectorAll('.ob-injury:checked').forEach(cb => {
      injuries.push(cb.value);
    });

    // Guardar equipamiento y lesiones en el player
    player.equipment = equip;
    player.injuries = injuries;
    player.voiceEnabled = true;
    player.geminiKey = "";

    // Mapeo Biomecánico Realista
    let pushLvl = 2;
    if (push === 'guerrero') pushLvl = 12;
    else if (push === 'campeon') pushLvl = 24;
    else if (push === 'maestro') pushLvl = 45;

    let pullLvl = 2;
    if (pull === 'guerrero') pullLvl = 10;
    else if (pull === 'campeon') pullLvl = 20;
    else if (pull === 'maestro') pullLvl = 40;

    let strLvl = Math.round((pushLvl + pullLvl) / 2);
    let endLvl = Math.max(1, coreVal);
    let flexLvl = Math.max(1, flexVal);

    let spdLvl = 3;
    if (exp === 'bambu') spdLvl = 12;
    else if (exp === 'tigre') spdLvl = 25;

    // Modular por experiencia
    if (exp === 'semilla') {
      strLvl = Math.min(strLvl, 8);
      endLvl = Math.min(endLvl, 8);
      flexLvl = Math.min(flexLvl, 10);
    } else if (exp === 'bambu') {
      strLvl = Math.min(Math.max(strLvl, 6), 25);
      endLvl = Math.min(Math.max(endLvl, 6), 25);
    } else if (exp === 'tigre') {
      strLvl = Math.max(strLvl, 15);
      endLvl = Math.max(endLvl, 15);
      flexLvl = Math.max(flexLvl, 10);
    }

    let maxInitLvl = Math.max(strLvl, spdLvl, flexLvl, endLvl);
    let startIdx = rankTitles.findIndex(r => maxInitLvl <= r.max);
    player.rankIndex = startIdx === -1 ? rankTitles.length - 1 : startIdx;

    let allowedCap = rankTitles[player.rankIndex].max;
    player.stats = {
      str: { lvl: Math.min(strLvl, allowedCap), xp: 0 },
      spd: { lvl: Math.min(spdLvl, allowedCap), xp: 0 },
      flex: { lvl: Math.min(flexLvl, allowedCap), xp: 0 },
      end: { lvl: Math.min(endLvl, allowedCap), xp: 0 }
    };

    player.workoutCount = 0;
    player.coins = 100; // Monedas iniciales para alentar el bazar

    savePlayer();
    document.getElementById('onboarding-wizard').classList.add('hide');
    updateUI();
    
    // Hablar bienvenida
    setTimeout(() => {
      speakSensei(`Bienvenido al Templo, ${player.name}. Tu sendero de disciplina marcial ha sido calibrado.`);
      showAscensionCard(getCurrentRank());
    }, 450);
  }

  function checkExamPending() {
    let cap = getCurrentRank().max;
    return player.stats.str.lvl >= cap && player.stats.spd.lvl >= cap && player.stats.flex.lvl >= cap && player.stats.end.lvl >= cap;
  }

  function updateUI() {
    document.getElementById('player-name').innerText = player.name;
    let rObj = getCurrentRank();
    document.getElementById('player-rank-title').innerText = rObj.title;
    document.getElementById('avatar').innerText = rObj.icon;

    let minLvl = Math.min(player.stats.str.lvl, player.stats.spd.lvl, player.stats.flex.lvl, player.stats.end.lvl);
    document.getElementById('player-level').innerText = minLvl;

    let strk = document.getElementById('player-streak');
    if (strk) strk.innerText = player.streak || 0;

    let coins = document.getElementById('player-coins');
    if (coins) coins.innerText = player.coins || 0;

    let streakIcon = document.getElementById('streak-icon');
    if (streakIcon) {
      let todayStr = new Date().toISOString().split('T')[0];
      if (player.lastWorkoutDate && typeof player.lastWorkoutDate === 'string' && player.lastWorkoutDate.startsWith(todayStr)) {
        streakIcon.style.filter = "none";
        streakIcon.style.opacity = "1";
      } else {
        streakIcon.style.filter = "grayscale(1)";
        streakIcon.style.opacity = "0.5";
      }
    }
    if (window.updateBadgesUI) window.updateBadgesUI();

    let cap = rObj.max;
    ['str', 'spd', 'flex', 'end'].forEach(s => {
      const statEl = document.getElementById('stat-' + s);
      if (statEl) {
        statEl.innerText = "Lvl " + player.stats[s].lvl;
        // HUEVO DE PASCUA: Entrenamiento especializado al tocar el nombre/nivel
        const parent = statEl.closest('.hud-stat');
        if (parent) {
          parent.onclick = () => startSpecializedTraining(s);
        }
      }
      let bar = document.getElementById('bar-' + s);
      if (bar) {
        if (player.stats[s].lvl >= cap) {
          bar.style.width = "100%";
          bar.style.background = "#ff5555";
          bar.style.boxShadow = "0 0 5px #ff5555";
        } else {
          bar.style.width = (player.stats[s].xp / (player.stats[s].lvl * 100)) * 100 + "%";
          bar.style.background = "var(--accent-gold)";
          bar.style.boxShadow = "0 0 5px var(--accent-gold)";
        }
      }
    });

    let examModeReady = checkExamPending();

    if (examModeReady) {
      if (document.getElementById('xp-text-mini')) document.getElementById('xp-text-mini').innerText = `¡EXAMEN DISPONIBLE!`;
      document.getElementById('xp-bar').style.width = '100%';
      document.getElementById('xp-bar').style.background = 'linear-gradient(90deg, #ff0000, #ff5555)';

      let btnCond = document.getElementById('btn-start-conditioning');
      if (btnCond) {
        btnCond.style.borderColor = '#ff0000';
        btnCond.innerHTML = `
            <div class="mission-status"><span style="color:#ff0000;">PRUEBA DE ASCENSO</span> <span></span></div>
            <h2 class="mission-title" style="color:#ff0000;">EXAMEN<br>MARCIAL</h2>
            <div class="mission-stats" style="color:#ff5555;">
              <span>DOLOR</span> <span>/</span> <span>RESISTENCIA EXTREMA</span> <span>/</span> <span>SINCERIDAD</span>
            </div>`;
      }
    } else {
      let cap = rObj.max;
      let prevCap = player.rankIndex === 0 ? 0 : rankTitles[player.rankIndex - 1].max;
      let totalNeeded = (cap - prevCap) * 4;
      let totalGained =
        Math.max(0, player.stats.str.lvl - prevCap) +
        Math.max(0, player.stats.spd.lvl - prevCap) +
        Math.max(0, player.stats.flex.lvl - prevCap) +
        Math.max(0, player.stats.end.lvl - prevCap);

      let percent = Math.min((totalGained / totalNeeded) * 100, 100);

      if (document.getElementById('xp-text-mini')) document.getElementById('xp-text-mini').innerText = `PROGRESO DE RANGO: ${Math.floor(percent)}%`;
      document.getElementById('xp-bar').style.width = percent + '%';
      document.getElementById('xp-bar').style.background = 'linear-gradient(90deg, #b8860b, var(--accent-gold))';

      let btnCond = document.getElementById('btn-start-conditioning');
      if (btnCond) {
        btnCond.style.borderColor = '';
        btnCond.innerHTML = `
            <div class="mission-status"><span style="color:var(--accent-gold);">SENDERO DEL GUERRERO</span> <span style="color:var(--accent-gold);">⚡</span></div>
            <h2 class="mission-title" style="font-size:1.8rem; text-shadow:0 0 10px rgba(255,215,0,0.2);">ACONDICIONAMIENTO<br>MARCIAL</h2>
            <div class="mission-stats" style="justify-content:center;">
              <span>FORJA DEL TEMPLO</span> <span>/</span> <span>PODER INTEGRAL</span>
            </div>
            <div class="mission-cta">🔥 FORJAR ENTRENAMIENTO DE HOY</div>`;
      }
    }
  }

  function gainXP(amount, statAlias) {
    if (checkExamPending()) return;

    let cap = getCurrentRank().max;
    let stat = player.stats[statAlias];

    if (stat.lvl >= cap) {
      if (window.sessionState && window.sessionState.active) {
        window.sessionState.reachedCap = true;
      } else {
        showNotification("Esta capacidad ha llegado a su tope momentáneo. Necesitas evolucionar tus otras disciplinas físicas y luego superar el Examen Final para ascender de Rango.", "Cuerpo al Límite");
      }
      return;
    }

    stat.xp += amount;
    if (window.sessionState && window.sessionState.active) {
      window.sessionState.gainedXP[statAlias] += amount;
    }

    let requiredXp = stat.lvl * 100;

    if (stat.xp >= requiredXp) {
      stat.xp -= requiredXp;
      stat.lvl++;

      if (window.sessionState && window.sessionState.active) {
        window.sessionState.levelUps.push({ stat: statAlias, lvl: stat.lvl });
      } else {
        showNotification(`¡Tu disciplina en ${STAT_LABELS[statAlias]} ha evolucionado al Nivel ${stat.lvl}!`, "🌟 DESBLOQUEO FÍSICO");
        updateLibraryUI();
      }

      if (checkExamPending()) {
        if (window.sessionState && window.sessionState.active) {
          window.sessionState.rankUpReady = true;
        } else {
          showNotification("Estás bloqueado en la cúspide de tu rango. Es hora de demostrar si eres digno del siguiente paso en el escalafón. Tu próxima Misión de Acondicionamiento será un EXAMEN DE ASCENSO.", "Examen Máximo Disponible");
        }
      }
    }

    savePlayer();
    updateUI();
  }

  // NOTA: La lógica de notificaciones ahora se gestiona globalmente en index.html

  function showAscensionCard(rankObj) {
    const color = rankObj.color || '#FFD700';
    document.getElementById('asc-rank-icon').textContent = rankObj.icon;
    document.getElementById('asc-rank-title').textContent = rankObj.title.toUpperCase();
    document.getElementById('asc-rank-wisdom').textContent = '"' + (rankObj.wisdom || '') + '"';
    document.getElementById('asc-rank-lore').textContent = rankObj.lore || '';
    const card = document.querySelector('.rank-ascension-card');
    if (card) {
      card.style.borderColor = color;
      card.style.boxShadow = '0 0 40px ' + color + '55, 0 20px 60px rgba(0,0,0,1)';
    }
    const wisdomEl = document.getElementById('asc-rank-wisdom');
    if (wisdomEl) { wisdomEl.style.borderLeftColor = color; wisdomEl.style.color = color; }
    const iconEl = document.getElementById('asc-rank-icon');
    if (iconEl) iconEl.style.textShadow = '0 0 30px ' + color;
    const labelEl = document.getElementById('asc-rank-label');
    if (labelEl) labelEl.style.color = color;
    // Restart animation each time
    if (card) { card.style.animation = 'none'; requestAnimationFrame(() => { card.style.animation = ''; }); }
    openModal('rank-ascension-modal');
  }

  let codexCurrentSlide = 0;

  function buildCodexSlides() {
    let slides = '';
    let dots = '';
    rankTitles.forEach((r, idx) => {
      const isAcquired = player.rankIndex >= idx;
      const isCurrent = player.rankIndex === idx;
      const color = r.color || '#FFD700';

      let cardClass = 'codex-rank-card';
      if (isCurrent) cardClass += ' is-current';
      if (!isAcquired) cardClass += ' is-locked';

      slides += '<div class="codex-slide">';
      slides += '<div class="' + cardClass + '" style="border-color:' + (isCurrent ? color : (isAcquired ? 'rgba(255,255,255,0.08)' : '#1a1a1a')) + ';">';

      if (isCurrent) {
        slides += '<div class="codex-current-badge" style="background:' + color + ';">ACTUAL</div>';
      }

      // Slide number indicator
      slides += '<div style="font-size:0.55rem; color:#555; letter-spacing:2px; text-align:center; margin-bottom:12px; text-transform:uppercase;">' + (idx + 1) + ' / ' + rankTitles.length + '</div>';

      if (isAcquired) {
        slides += '<div class="codex-rank-icon" style="text-shadow:0 0 20px ' + color + ';">' + r.icon + '</div>';
        slides += '<div class="codex-rank-name" style="color:' + (isCurrent ? color : '#fff') + ';">' + r.title + '</div>';
        slides += '<div class="codex-rank-cap">Límite Nivel ' + (r.max === 999 ? 'Máximo' : r.max) + '</div>';
        slides += '<div class="codex-rank-wisdom" style="border-left-color:' + color + '; color:' + color + ';">"' + (r.wisdom || '') + '"</div>';
        slides += '<div class="codex-rank-lore">' + (r.lore || '') + '</div>';
      } else {
        slides += '<div class="codex-rank-icon is-locked">' + r.icon + '</div>';
        slides += '<div class="codex-rank-name" style="color:#333;">??? RANGO SELLADO</div>';
        slides += '<div class="codex-rank-cap" style="color:#2a2a2a;">Supera el Examen Marcial para revelar este conocimiento</div>';
      }

      slides += '</div>'; // close card
      slides += '</div>'; // close slide

      // Dots
      let dotClass = 'codex-dot';
      if (isAcquired) dotClass += ' acquired';
      dots += '<div class="' + dotClass + '" onclick="codexGoTo(' + idx + ')"></div>';
    });
    return { slides, dots };
  }

  function updateCodexDots(activeIdx) {
    const dotsContainer = document.getElementById('codex-dots');
    if (!dotsContainer) return;
    const allDots = dotsContainer.querySelectorAll('.codex-dot');
    allDots.forEach((d, i) => {
      d.classList.toggle('active', i === activeIdx);
    });
  }

  window.codexSlide = function (direction) {
    const carousel = document.getElementById('codex-carousel');
    if (!carousel) return;
    const slideWidth = carousel.clientWidth;
    const maxSlide = rankTitles.length - 1;
    codexCurrentSlide = Math.max(0, Math.min(maxSlide, codexCurrentSlide + direction));
    carousel.scrollTo({ left: codexCurrentSlide * slideWidth, behavior: 'smooth' });
    updateCodexDots(codexCurrentSlide);
  };

  window.codexGoTo = function (idx) {
    const carousel = document.getElementById('codex-carousel');
    if (!carousel) return;
    codexCurrentSlide = idx;
    const slideWidth = carousel.clientWidth;
    carousel.scrollTo({ left: codexCurrentSlide * slideWidth, behavior: 'smooth' });
    updateCodexDots(codexCurrentSlide);
  };

  window.updateCodexUI = function () {
    const carouselEl = document.getElementById('codex-carousel');
    const dotsEl = document.getElementById('codex-dots');
    if (!carouselEl) return;

    const { slides, dots } = buildCodexSlides();
    carouselEl.innerHTML = slides;
    if (dotsEl) dotsEl.innerHTML = dots;

    document.getElementById('codex-sessions').innerText = player.workoutCount;

    let hxHtml = workoutHistory.slice(-5).reverse().map(h => {
      const dateStr = h.date || '';
      const typeStr = h.type || (h.routine ? 'Entrenamiento' : 'Sesión');
      return '<div style="margin-bottom:4px; border-left:2px solid var(--accent-gold); padding-left:6px;"><span style="color:var(--text-dim); font-size:0.6rem;">' + dateStr + '</span> <span style="color:#ccc;">' + typeStr + '</span></div>';
    }).join('');
    if (workoutHistory.length === 0) hxHtml = "<span style='color:#666; font-style:italic;'>Aún no hay gestas registradas.</span>";
    let hxContainer = document.getElementById('codex-history');
    if (hxContainer) hxContainer.innerHTML = hxHtml;

    // Track scroll position to update dots
    carouselEl.onscroll = function () {
      const slideWidth = carouselEl.clientWidth;
      if (slideWidth === 0) return;
      const newIdx = Math.round(carouselEl.scrollLeft / slideWidth);
      if (newIdx !== codexCurrentSlide) {
        codexCurrentSlide = newIdx;
        updateCodexDots(codexCurrentSlide);
      }
    };
  };

  window.openCodexModal = function () {
    updateCodexUI();
    openModal('codex-modal');
    // Auto-scroll to current rank slide after a brief delay for DOM rendering
    setTimeout(() => {
      codexCurrentSlide = player.rankIndex;
      const carousel = document.getElementById('codex-carousel');
      if (carousel) {
        const slideWidth = carousel.clientWidth;
        carousel.scrollTo({ left: codexCurrentSlide * slideWidth, behavior: 'auto' });
      }
      updateCodexDots(codexCurrentSlide);
    }, 100);
  };


  window.openInfoModal = function (name, desc, imgUrl) {
    if (!name) name = "Técnica Ancestral";
    if (typeof desc !== 'string') desc = "No hay descripción detallada registrada para esta técnica.";

    document.getElementById('info-title').innerText = name;

    // Separar la descripción técnica y el Consejo Zen del Sensei
    let mainDesc = desc;
    let zenTip = '';
    const zenMatch = desc.match(/(?:Consejo Zen|Consejos Zen):\s*([\s\S]+)$/i);
    if (zenMatch) {
      zenTip = zenMatch[1].trim();
      mainDesc = desc.replace(zenMatch[0], '').trim();
    }

    let items = mainDesc.split(/\d+\.\s*/).filter(i => i.trim() !== '');
    let listHtml = '';
    if (items.length > 1) {
      listHtml = '<ol style="padding-left: 20px; font-family: \'Inter\', sans-serif; font-style: italic; border-left: 2px solid var(--accent-red); padding-left: 15px; margin: 0 0 20px 0;">';
      items.forEach(item => {
        listHtml += `<li style="margin-bottom: 12px; color: #ccc; line-height: 1.5;">${item.trim()}</li>`;
      });
      listHtml += '</ol>';
    } else {
      listHtml = `<p style="line-height: 1.5; color: #ccc; font-style: italic; border-left: 2px solid var(--accent-red); padding-left: 12px; margin: 0 0 20px 0;">${mainDesc}</p>`;
    }

    if (zenTip) {
      listHtml += `
        <div style="margin-top: 20px; padding: 14px 16px; background: rgba(255, 215, 0, 0.03); border: 1px solid rgba(255, 215, 0, 0.25); border-radius: 8px; box-shadow: inset 0 0 10px rgba(255, 215, 0, 0.02); text-align: left;">
          <div style="font-family: 'Cinzel', serif; font-size: 0.75rem; color: var(--accent-gold); letter-spacing: 2px; font-weight: bold; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
            🐉 CONSEJO SENSEI
          </div>
          <p style="margin: 0; font-family: 'Inter', sans-serif; font-size: 0.78rem; color: #ddd; line-height: 1.55; font-style: italic;">
            "${zenTip}"
          </p>
        </div>
      `;
    }
    document.getElementById('info-desc').innerHTML = listHtml;

    let imgContainer = document.getElementById('info-img-container');
    if (imgUrl && (imgUrl.startsWith('http') || imgUrl.startsWith('./'))) {
      imgContainer.innerHTML = `
        <img src="${imgUrl}" class="zoomable-image" onclick="openLightbox(this.src)" style="width:100%; border-radius:8px; border:1px solid var(--accent-gold);" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
        <div style="display:none; width:100%; height:180px; background:#111; border-radius:8px; border:1px dashed #444; align-items:center; justify-content:center; color:#555; font-size:0.8rem; font-family:'Inter'; text-transform:uppercase; letter-spacing:1px; text-align:center; padding:10px;">[ Transmisión Visual Dañada ]</div>
        <div style="font-size:0.65rem; color:#666; text-align:center; margin-top:8px; font-family:'Inter';">Cámaras del Códice - Toca la imagen para Ampliar/Reducir.</div>
      `;
    } else {
      imgContainer.innerHTML = `<div style="width:100%; height:180px; background:#111; border-radius:8px; border:1px dashed #444; display:flex; align-items:center; justify-content:center; color:#555; font-size:0.8rem; font-family:'Inter'; text-transform:uppercase; letter-spacing:1px; text-align:center; padding:10px;">[ Transmisión Visual Dañada ]</div>`;
    }
    openModal('info-modal');
  }
  document.getElementById('info-close').addEventListener('click', () => {
    closeModal('info-modal');
    document.getElementById('info-img-container').innerHTML = '';
  });

  // ====== BIBLIOTECA MARCIAL ======
  let currentLibraryTab = 'str';

  window.openLibraryModal = function () {
    updateLibraryUI();
    openModal('library-modal');
  };

  window.switchLibraryTab = function (stat, el) {
    currentLibraryTab = stat;
    document.querySelectorAll('.lib-tab').forEach(t => {
      t.classList.remove('active-tab');
      t.style.color = '#666';
      t.style.borderBottomColor = 'transparent';
    });
    el.classList.add('active-tab');
    el.style.color = 'var(--accent-gold)';
    el.style.borderBottomColor = 'var(--accent-gold)';
    updateLibraryUI();
  };

  window.updateLibraryUI = function () {
    const listEl = document.getElementById('library-list');
    if (!listEl) return;
    let content = '';

    // Filtrar por stat de la pestaña actual
    const filteredDB = EXERCISE_DB.filter(ex => ex.s === currentLibraryTab);

    filteredDB.forEach(ex => {
      let pLvl = player.stats[ex.s]?.lvl || 1;
      let isLocked = ex.lvl_min > pLvl;
      let displayName = isLocked ? "??? (Técnica Bloqueada)" : ex.n + " - " + ex.real;
      let displayDesc = isLocked ? `Requiere Nivel ${ex.lvl_min} físico de ${STAT_LABELS[ex.s] || ex.s} para desbloquear.` : ex.desc;
      let imgStyle = isLocked ? "filter: blur(8px) grayscale(1) brightness(0.5); opacity: 0.6;" : "";
      let borderCol = isLocked ? '#222' : 'var(--accent-gold)';

      let typeBadge = '';
      if (ex.s === "str") typeBadge = '<span style="background:#8f2020; color:#fff; padding:2px 6px; border-radius:4px; font-size:0.7rem;">FUERZA</span>';
      if (ex.s === "spd") typeBadge = '<span style="background:#5555ff; color:#fff; padding:2px 6px; border-radius:4px; font-size:0.7rem;">VELOCIDAD</span>';
      if (ex.s === "end") typeBadge = '<span style="background:#555555; color:#fff; padding:2px 6px; border-radius:4px; font-size:0.7rem;">RESISTENCIA</span>';
      if (ex.s === "flex") typeBadge = '<span style="background:#28a745; color:#fff; padding:2px 6px; border-radius:4px; font-size:0.7rem;">FLEXIBILIDAD</span>';

      content += `
        <div ontouchstart="" onclick="openExerciseDetail('${ex.id || ex.n.replace(/[^a-z]/gi, '')}')" style="cursor:pointer; background:#151515; border: 1px solid ${borderCol}; border-radius:8px; padding:12px; margin-bottom:15px; display:flex; gap:15px; align-items:center; transition: transform 0.1s ease; active:transform scale(0.98)" 
          ontouchstart="this.style.transform='scale(0.98)';" 
          ontouchend="this.style.transform='';">
          <div style="width:70px; height:70px; flex-shrink:0; border-radius:6px; overflow:hidden; border:1px solid #333; background:#111; display:flex; align-items:center; justify-content:center;">
             <img src="${ex.m}" loading="lazy" style="width:100%; height:100%; object-fit:cover; ${imgStyle}" onerror="this.style.display='none'; this.parentElement.innerHTML+='<span style=\\'font-size:1.5rem; opacity:0.4;\\'>${ex.s === 'str' ? '🦾' : ex.s === 'spd' ? '⚡' : ex.s === 'end' ? '🛡️' : '🧘‍♂️'}</span>';">
          </div>
          <div style="flex-grow:1;">
             <h3 style="color:${isLocked ? '#666' : '#fff'}; font-family:'Cinzel'; font-size:0.9rem; margin:0 0 5px 0; line-height:1.2;">${displayName}</h3>
             ${isLocked ? '' : `<div style="margin-bottom:6px;">${typeBadge} <span style="color:#888; font-size:0.7rem; margin-left:5px;">Lvl: ${ex.lvl_min}</span></div>`}
             <p style="color:${isLocked ? '#ff5555' : '#888'}; font-size:0.75rem; line-height:1.4; margin:0;">${displayDesc}</p>
          </div>
        </div>`;
      window._exDB = window._exDB || {};
      if (!isLocked) window._exDB[ex.id || ex.n.replace(/[^a-z]/gi, '')] = ex;
    });

    listEl.innerHTML = content;
  };

  window.openLibraryModal = function () {
    updateLibraryUI();
    openModal('library-modal');
  };

  window.openExerciseDetail = function (exId) {
    const ex = (window._exDB || {})[exId];
    if (!ex) return;
    let statNames = { str: 'Fuerza', spd: 'Velocidad', end: 'Resistencia', flex: 'Flexibilidad' };
    let statColors = { str: '#8f2020', spd: '#5555ff', end: '#555', flex: '#28a745' };
    let html = `
      <div style="text-align:center; padding-bottom:5px;">
        <img src="${ex.m}" onclick="openLightbox('${ex.m}')" style="width:100%; max-height:220px; object-fit:cover; border-radius:10px; cursor:zoom-in; margin-bottom:15px; border:1px solid var(--glass-border);" onerror="this.style.display='none'; document.getElementById('ex-detail-img-fallback').style.display='flex';">
        <div id="ex-detail-img-fallback" style="display:none; width:100%; height:180px; background:#111; border-radius:10px; border:1px dashed #444; align-items:center; justify-content:center; color:#555; font-size:0.8rem; font-family:'Inter'; text-transform:uppercase; letter-spacing:1px; text-align:center; padding:10px; margin-bottom:15px;">[ Transmisión Visual Dañada ]</div>
        <h2 style="font-family:'Cinzel'; color:var(--accent-gold); font-size:1.2rem; margin-bottom:6px;">${ex.n}</h2>
        <p style="color:#888; font-size:0.75rem; margin-bottom:12px; letter-spacing:1px;">${ex.real}</p>
        <div style="display:flex; gap:8px; justify-content:center; margin-bottom:15px;">
          <span style="background:${statColors[ex.s]}; color:#fff; padding:3px 10px; border-radius:4px; font-size:0.75rem; font-weight:700;">${statNames[ex.s]}</span>
          <span style="background:#222; color:var(--accent-gold); padding:3px 10px; border-radius:4px; font-size:0.75rem;">Nivel mínimo: ${ex.lvl_min}</span>
        </div>
        <p style="color:#ccc; font-size:0.9rem; line-height:1.6; text-align:left; margin-bottom:20px;">${ex.desc}</p>
        <button class="btn-primary" onclick="closeModal('exercise-detail-modal')">CERRAR</button>
      </div>`;
    document.getElementById('exercise-detail-body').innerHTML = html;
    openModal('exercise-detail-modal');
  }

  // ORÁCULO OFFLINE (MOTOR PROCEDIMENTAL)
  function generateOfflineRoutine(type, focusStat = null) {
    document.getElementById('loader').style.display = 'block';

    setTimeout(() => {
      try {
      // Helper function to safely fetch N unique exercises from a filter predicate
      function fetchExercises(predicate, count, requiredStatLvl) {
        let maxLvlCap = window.isExamRoutine ? 10 : 0;
        
        // 1. Strict Query (Matches exactly level limits)
        let valid = EXERCISE_DB.filter(ex => {
          let limit = ex.lvl_max + maxLvlCap;
          
          // Equipment check
          let matchesEquip = true;
          let userEquip = player.equipment || 'none';
          if (userEquip === 'none') {
            matchesEquip = (ex.equip === 'none');
          } else if (userEquip === 'bar') {
            matchesEquip = (ex.equip === 'none' || ex.equip === 'bar');
          }
          
          // Injury check
          let avoidsInjuries = true;
          let userInjuries = player.injuries || [];
          if (ex.avoidInjuries && userInjuries.length > 0) {
            avoidsInjuries = !ex.avoidInjuries.some(i => userInjuries.includes(i));
          }

          return predicate(ex) && requiredStatLvl >= ex.lvl_min && requiredStatLvl <= limit && matchesEquip && avoidsInjuries;
        });

        // 2. Fallback: If not enough unique exercises, drop the maximum cap (e.g. at lvl 99 allow returning to lvl 60 exercises, scaling will handle the toughness)
        if (valid.length < count) {
          valid = EXERCISE_DB.filter(ex => {
            let matchesEquip = true;
            let userEquip = player.equipment || 'none';
            if (userEquip === 'none') matchesEquip = (ex.equip === 'none');
            else if (userEquip === 'bar') matchesEquip = (ex.equip === 'none' || ex.equip === 'bar');
            
            let avoidsInjuries = true;
            let userInjuries = player.injuries || [];
            if (ex.avoidInjuries && userInjuries.length > 0) avoidsInjuries = !ex.avoidInjuries.some(i => userInjuries.includes(i));

            return predicate(ex) && requiredStatLvl >= ex.lvl_min && matchesEquip && avoidsInjuries;
          });
        }
        
        // 3. Final Fallback: If still not enough, still respect lvl_min (user MUST be able to do it)
        // but drop the lvl_max cap to allow higher-level exercises at their base values
        if (valid.length < count) {
          valid = EXERCISE_DB.filter(ex => {
            let matchesEquip = true;
            let userEquip = player.equipment || 'none';
            if (userEquip === 'none') matchesEquip = (ex.equip === 'none');
            else if (userEquip === 'bar') matchesEquip = (ex.equip === 'none' || ex.equip === 'bar');
            let avoidsInjuries = true;
            let userInjuries = player.injuries || [];
            if (ex.avoidInjuries && userInjuries.length > 0) {
              avoidsInjuries = !ex.avoidInjuries.some(i => userInjuries.includes(i));
            }
            // CRITICAL: lvl_min MUST be respected — user must be capable of doing the exercise
            return predicate(ex) && requiredStatLvl >= ex.lvl_min && matchesEquip && avoidsInjuries;
          });
        }

        // 4. Absolute last resort: same stat, any level — only if pool is completely empty
        if (valid.length === 0) {
          valid = EXERCISE_DB.filter(ex => {
            const s = ex.s;
            return predicate(ex);
          }).slice(0, count);
        }

        // Shuffle pool
        let pool = [...valid].sort(() => 0.5 - Math.random());
        let results = [];
        
        // Add elements, repeating only if count > pool size
        while (results.length < count) {
          for (let i = 0; i < pool.length && results.length < count; i++) {
            results.push(pool[i]);
          }
          // Shuffle again to randomize loops if repeating is mandatory
          pool.sort(() => 0.5 - Math.random());
          if (pool.length === 0) break; // Defensive
        }
        
        return results;
      }

      let selected = [];
      window.currentAiMessage = "Forjando sesión con parámetros neutrales.";

      if (window.isExamRoutine) {
        window.currentAiMessage = "El Oráculo te pone a prueba. Demuestra que eres digno de ascender realizando este Examen de Poder sin titubear.";
      }

      if (focusStat && !window.isExamRoutine) {
        // Specialized Training: Fixed 6 exercises of a single stat
        let pLvl = player.stats[focusStat]?.lvl || 1;
        selected = fetchExercises(ex => ex.s === focusStat, 6, pLvl);
        window.currentAiMessage = `Has elegido enfocarte en tu ${STAT_LABELS[focusStat]}. El Maestro aprueba tu determinación. Hoy nos centraremos sólo en eso.`;
      } else {
        // Smart Trainer Logic based on stats
        let pLvlStr = player.stats.str?.lvl || 1;
        let pLvlSpd = player.stats.spd?.lvl || 1;
        let pLvlEnd = player.stats.end?.lvl || 1;
        let pLvlFlex = player.stats.flex?.lvl || 1;

        let statsArr = [
          { s: 'str', lvl: pLvlStr },
          { s: 'spd', lvl: pLvlSpd },
          { s: 'end', lvl: pLvlEnd },
          { s: 'flex', lvl: pLvlFlex }
        ];

        statsArr.sort((a,b) => a.lvl - b.lvl);
        let weakest = statsArr[0].s;
        let weakestLvl = statsArr[0].lvl;
        let strongest = statsArr[statsArr.length - 1].s;
        let strongestLvl = statsArr[statsArr.length - 1].lvl;
        let maxDiff = strongestLvl - weakestLvl;
        
        // Use dynamic date offsets combined with reforge offset to ensure split variety during testing or daily generations
        const dynamicOffset = new Date().getDay() + new Date().getDate() + (window.reforgeOffset || 0);
        let cycleIdx = (player.workoutCount + dynamicOffset) % 5;
        let finalSplit = 0; // 0: Upper, 1: Lower, 2: FullBody, 3: Weakness, 4: Combo

        if (!window.isExamRoutine && maxDiff >= 3 && cycleIdx === 3) {
           finalSplit = 3; // Corregir debilidad
           window.currentAiMessage = `El Maestro observa que tu ${STAT_LABELS[weakest]} está rezagada (Lvl ${weakestLvl}). Un verdadero guerrero no tiene puntos ciegos. Hoy corregiremos esa debilidad.`;
        } else if (!window.isExamRoutine && maxDiff >= 4 && cycleIdx === 4) {
           finalSplit = 4; // Mezclar débil y fuerte
           window.currentAiMessage = `Debes equilibrar tus fuerzas. Hoy fusionaremos tu supremacía en ${STAT_LABELS[strongest]} con tu debilidad en ${STAT_LABELS[weakest]}.`;
        } else {
           finalSplit = (player.workoutCount + dynamicOffset) % 3;
           if (!window.isExamRoutine) {
                if (finalSplit === 0) window.currentAiMessage = "Hoy forjaremos el Tronco y la Fuerza Base. Empuje, tracción y un núcleo irrompible para cimentar tu postura.";
                else if (finalSplit === 1) window.currentAiMessage = "Un árbol sin raíces cae ante la tormenta. Hoy toca sufrir para fortalecer tus Piernas y tu Explosividad.";
                else window.currentAiMessage = "El templo exige fluidez. Hoy trabajaremos la Agilidad, Flexibilidad y Resistencia Total para moverte como el viento.";
           }
        }

        let isLowRank = (player.rankIndex || 0) < 4; // Rango < 4 (Principiante - Nivel < 30)

        if (finalSplit === 0) {
          // DIA A: TREN SUPERIOR Y TRONCO
          let getPush = ex => ex.s === 'str' && ex.f === 'push';
          let getPull = ex => ex.s === 'str' && ex.f === 'pull';
          let getCore = ex => ex.s === 'end' && ex.f === 'core'; 
          let getStretchUpper = ex => ex.s === 'flex' && ex.f === 'upper'; 

          selected.push(...fetchExercises(getPush, isLowRank ? 2 : 3, pLvlStr));
          selected.push(...fetchExercises(getPull, 2, pLvlStr));
          selected.push(...fetchExercises(getCore, isLowRank ? 1 : 2, pLvlEnd));
          selected.push(...fetchExercises(getStretchUpper, 1, pLvlFlex));

        } else if (finalSplit === 1) {
          // DIA B: TREN INFERIOR Y EXPLOSIVIDAD
          let getLegsStr = ex => ex.s === 'str' && ex.f === 'legs';
          let getLegsIso = ex => ex.s === 'end' && ex.f === 'iso_legs';
          let getCardio = ex => ex.s === 'spd' && ex.f === 'cardio';
          let getStretchLower = ex => ex.s === 'flex' && ex.f === 'lower';

          selected.push(...fetchExercises(getLegsStr, isLowRank ? 2 : 3, pLvlStr));
          selected.push(...fetchExercises(getLegsIso, 1, pLvlEnd));
          selected.push(...fetchExercises(getCardio, isLowRank ? 2 : 3, pLvlSpd));
          selected.push(...fetchExercises(getStretchLower, 1, pLvlFlex));

        } else if (finalSplit === 2) {
          // DIA C: ÁGILIDAD, MOVILIDAD Y ENDURANCE FULL BODY
          let getSpd = ex => ex.s === 'spd';
          let getEnd = ex => ex.s === 'end' && ex.f !== 'iso_legs'; 
          let getFlex = ex => ex.s === 'flex';

          selected.push(...fetchExercises(getSpd, isLowRank ? 2 : 3, pLvlSpd));
          selected.push(...fetchExercises(getEnd, isLowRank ? 2 : 3, pLvlEnd));
          selected.push(...fetchExercises(getFlex, 2, pLvlFlex));

        } else if (finalSplit === 3) {
          // WEAKNESS CORRECTION
          let targetLvl = player.stats[weakest]?.lvl || 1;
          selected = fetchExercises(ex => ex.s === weakest, isLowRank ? 4 : 6, targetLvl);
          selected.push(...fetchExercises(ex => ex.s === 'flex', 2, pLvlFlex));

        } else if (finalSplit === 4) {
          // COMBO MIX (Weakest + Strongest)
          let tWeak = player.stats[weakest]?.lvl || 1;
          let tStrong = player.stats[strongest]?.lvl || 1;
          selected.push(...fetchExercises(ex => ex.s === weakest, isLowRank ? 3 : 4, tWeak));
          selected.push(...fetchExercises(ex => ex.s === strongest, isLowRank ? 2 : 3, tStrong));
          selected.push(...fetchExercises(ex => ex.s === 'flex', 1, pLvlFlex));
        }
      }

      // 3. Escalar matemáticamente (sin barajar al final para mantener orden)
      let routine = selected.map(ex => {
        let isExam = window.isExamRoutine;
        let pLvl = player.stats[ex.s]?.lvl || 1;
        let virtualLevel = isExam ? ex.lvl_max : pLvl;
        
        // Evitar que el fallback asigne 100+ repeticiones a un ejercicio básico acotando su techo orgánico.
        let capLevel = Math.min(virtualLevel, ex.lvl_max + 5);

        let factor = (capLevel - ex.lvl_min) * ex.scale;
        let finalVal = Math.floor(Math.max(ex.baseVal, ex.baseVal + factor));
        
        let numSets = 2; // Default (Rank 0-1)
        if ((player.rankIndex || 0) >= 6) numSets = 4; // Rank 6+
        else if ((player.rankIndex || 0) >= 2) numSets = 3; // Rank 2-5

        if (type === 'mobility') numSets = 2;
        if (isExam) numSets += 1;

        // relic_scroll passive effect: +1 set (max 5)
        if (player.equippedRelic === 'relic_scroll') {
          numSets += 1;
        }
        numSets = Math.min(5, numSets);

        return {
          id: ex.id,
          n: `${ex.n} (${ex.real})`,
          r: `${finalVal} ${ex.t === "time" ? "segs" : "reps"}`,
          t: ex.t,
          val: finalVal,
          s: ex.s,
          domain: ex.domain,
          sets: numSets,
          desc: ex.desc,
          m: ex.m,
          alt: ex.alt
        };
      });

      currentRoutine = routine;
      document.getElementById('loader').style.display = 'none';
      renderOverview(routine);

      } catch (err) {
        console.error("ZenRyu: Error in offline generator", err);
        document.getElementById('loader').style.display = 'none';
        showNotification("El Templo ha experimentado una perturbación al forjar tu rutina. Por favor, verifica tu nivel de atributos y vuelve a intentarlo.", "Fallo del Templo");
      }
    }, 150);
  }

  let activeCheckinType = 'conditioning';
  let activeCheckinFocus = null;

  const startRoutineHandler = (type = 'conditioning', focusStat = null) => {
    let examPending = checkExamPending();
    if (examPending && type === 'conditioning') {
      showNotification("El Oráculo observa tu espíritu. Estás a punto de iniciar una Prueba de Ascenso. Sé absolutamente sincero: marca como terminada una serie SÓLO si realmente lograste el esfuerzo estricto y la técnica correcta. Engañar al sistema hoy significa lesionarte mañana en niveles superiores. El honor no admite auto-trampas.", "Examen Marcial de Honor", () => {
        window.isExamRoutine = true;
        activeCheckinType = type;
        activeCheckinFocus = focusStat;
        openModal('checkin-modal');
      });
      return;
    } else if (examPending && type === 'mobility') {
      showNotification("Debes probar tu valía física en el Examen de Ascenso antes de recuperar el aliento en la movilidad.", "Disciplina");
      return;
    }

    window.isExamRoutine = false;
    window.currentFocusStat = focusStat; // Guardar el foco para la sesión actual
    
    // Open check-in modal
    activeCheckinType = type;
    activeCheckinFocus = focusStat;
    openModal('checkin-modal');
  };

  window.submitCheckin = function() {
    let energy = parseInt(document.getElementById('ci-energy').value) || 3;
    let soreness = document.getElementById('ci-soreness').value;
    let notes = document.getElementById('ci-notes').value.trim();
    
    window.dailyCheckin = {
      energy: energy,
      soreness: soreness,
      notes: notes
    };
    
    closeModal('checkin-modal');
    initRoutineGeneration(activeCheckinType, activeCheckinFocus);
  };

  function initRoutineGeneration(type, focusStat = null) {
    // Wrap view transitions in document.startViewTransition if available
    const transitionView = () => {
      switchView('routine-overview-view', 'home-view');
      document.getElementById('overview-content').style.display = 'none';
    };
    if (document.startViewTransition) {
      document.startViewTransition(transitionView);
    } else {
      transitionView();
    }

    if (player.geminiKey && player.geminiKey.trim() !== '') {
      generateGeminiRoutine(type, focusStat);
    } else {
      generateOfflineRoutine(type, focusStat);
    }
  }

  if (document.getElementById('btn-start-conditioning')) document.getElementById('btn-start-conditioning').addEventListener('click', () => startRoutineHandler('conditioning'));

  window.startSpecializedTraining = function (statAlias) {
    startRoutineHandler('conditioning', statAlias);
  };

  function penalizeRankExit() {
    let cap = getCurrentRank().max;
    ['str', 'spd', 'flex', 'end'].forEach(s => {
      player.stats[s].lvl = Math.max(1, cap - 1);
      player.stats[s].xp = (cap - 1) * 80;
    });
    savePlayer();
    updateUI();
    showNotification("Un guerrero conoce sus límites. Te has retirado del Examen de Ascenso. Has retrocedido en tu maestría para forjarte de nuevo.", "Retorno a las Sombras");
  }

  document.getElementById('btn-cancel-overview').addEventListener('click', () => {
    if (window.isExamRoutine) penalizeRankExit();
    switchView('home-view', 'routine-overview-view');
  });

  document.getElementById('btn-cancel-focus').addEventListener('click', () => {
    if (window.isExamRoutine) {
      showNotification(
        "Un guerrero debe ser sincero con sus capacidades. Si sientes que no puedes completar este examen con honor y técnica perfecta, puedes retirarte hoy para volver más fuerte mañana. Pero ten en cuenta: retirarte de una Prueba de Ascenso conlleva una penalización en tu maestría actual.",
        "El Juicio del Maestro",
        () => {
          penalizeRankExit();
          window.sessionState.active = false;
          switchView('home-view', 'routine-focus-view');
        },
        true
      );
    } else {
      window.sessionState.active = false;
      switchView('home-view', 'routine-focus-view');
    }
  });

  document.getElementById('btn-reforge-routine').addEventListener('click', () => {
    let currentType = currentRoutine[0]?.domain || 'conditioning';
    let currentFocus = window.currentFocusStat || null; // Recuperar el foco si existe
    document.getElementById('overview-content').style.display = 'none';
    window.reforgeOffset = (window.reforgeOffset || 0) + 1;
    if (player.geminiKey && player.geminiKey.trim() !== '') {
      generateGeminiRoutine(currentType, currentFocus);
    } else {
      generateOfflineRoutine(currentType, currentFocus);
    }
  });

  document.getElementById('btn-start-focus').addEventListener('click', () => {
    window.sessionState = {
      active: true,
      gainedXP: { str: 0, spd: 0, flex: 0, end: 0 },
      levelUps: [],
      rankUpReady: false,
      reachedCap: false
    };
    switchView('routine-focus-view', 'routine-overview-view');

    const cancelBtn = document.getElementById('btn-cancel-focus');
    cancelBtn.style.display = 'block';

    if (window.isExamRoutine) {
      cancelBtn.innerText = "RETIRADA HONORABLE";
      cancelBtn.style.color = "#ff3333";
      cancelBtn.style.textShadow = "0 0 10px rgba(255,0,0,0.5)";
    } else {
      cancelBtn.innerText = "ABANDONAR";
      cancelBtn.style.color = "#ff5555";
      cancelBtn.style.textShadow = "none";
    }

    renderFocusExercises(currentRoutine);
  });

  function processSessionResults() {
    console.log("ZenRyu: Starting session completion sequence.");
    window.sessionState.active = false;
    if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);

    const finContainer = document.getElementById('focus-finish-container');
    if (finContainer) {
      finContainer.style.filter = "brightness(0.2) blur(4px)";
      finContainer.style.transition = "filter 0.5s ease";
    }

    let rewardsText = "";
    let gainedXp = false;
    for (let s in window.sessionState.gainedXP) {
      if (window.sessionState.gainedXP[s] > 0) {
        rewardsText += `• ${STAT_LABELS[s]}: +${window.sessionState.gainedXP[s]} XP\n`;
        gainedXp = true;
      }
    }

    let levelUpsText = "";
    window.sessionState.levelUps.forEach(lu => {
      levelUpsText += `• ${STAT_LABELS[lu.stat]} ha subido al Nivel ${lu.lvl}!\n`;
    });

    let steps = [];
    if (gainedXp || levelUpsText) {
      let fullMsg = "Has completado la forja física de hoy.\n\n";
      if (gainedXp) fullMsg += "EXPERIENCIA GANADA:\n" + rewardsText + "\n";
      if (levelUpsText) fullMsg += "DESBLOQUEOS:\n" + levelUpsText;

      steps.push({ title: "🎖 RESUMEN DE PROGRESO", msg: fullMsg });
    }

    if (window.sessionState.reachedCap) {
      steps.push({ title: "Cuerpo al Límite", msg: "Has alcanzado el tope en esta disciplina. Forja tus otras capacidades para desbloquear el Examen de Ascenso." });
    }

    if (window.sessionState.rankUpReady) {
      steps.push({ title: "Examen Disponible", msg: "Has alcanzado la cúspide de tu rango. Próxima misión será un EXAMEN DE ASCENSO." });
    }

    let currentType = (currentRoutine && currentRoutine[0] && currentRoutine[0].domain) ? currentRoutine[0].domain : 'conditioning';
    let typeName = window.isExamRoutine ? "Examen Marcial" : (currentType === 'mobility' ? "Flexibilidad Activa" : "Acondicionamiento Físico");

    const finishAndSwitchMap = () => {
      const finContainer = document.getElementById('focus-finish-container');
      if (finContainer) {
        finContainer.style.display = 'none';
        finContainer.style.filter = 'none';
        finContainer.classList.remove('pulse-glow');
      }

      try {
        const focusContainer = document.getElementById('focus-exercises-container');
        if (focusContainer) focusContainer.innerHTML = '';
        
        let histEntry = {
          date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: typeName
        };
        workoutHistory.unshift(histEntry);
        if (workoutHistory.length > 50) workoutHistory.pop();

        zendb.addHistory(histEntry).catch(e => console.error("ZenRyu: DB Error", e));
        player.workoutCount++;
        savePlayer();
        updateUI();
        updateCodexUI();

        switchView('home-view', 'routine-focus-view');

        window.isExamRoutine = false;
        window.currentFocusStat = null;
        window.sessionState = {
          active: false,
          gainedXP: { str: 0, spd: 0, flex: 0, end: 0 },
          levelUps: [],
          rankUpReady: false,
          reachedCap: false
        };
      } catch (e) {
        console.error("ZenRyu: Critical error in finishAndSwitchMap", e);
        switchView('home-view', 'routine-focus-view');
      }
    };

    const executeFinalStep = () => {
      if (window.isExamRoutine) {
        if (player.rankIndex < rankTitles.length - 1) {
          player.rankIndex++;
        }
        ['str', 'spd', 'flex', 'end'].forEach(s => { player.stats[s].xp = 0; });
        initAudio();
        playFanfare();
        if (typeof throwConfetti === 'function') throwConfetti();
        
        finishAndSwitchMap();
        setTimeout(() => {
          showAscensionCard(getCurrentRank());
        }, 600);
      } else {
        finishAndSwitchMap();
      }
    };

    const nextStep = () => {
      if (steps.length === 0) {
        executeFinalStep();
      } else {
        let step = steps.shift();
        showNotification(step.msg, step.title, nextStep);
      }
    };

    nextStep();
  }

  document.getElementById('btn-finish-routine').addEventListener('click', () => {
    processSessionResults();
  });

  function renderOverview(exercises) {
    const ovList = document.getElementById('ov-list');
    let totalSecs = 0;
    let focusObj = {};
    let html = '';

    exercises.forEach((ex, idx) => {
      focusObj[ex.s] = (focusObj[ex.s] || 0) + 1;
      let sets = ex.sets || 3;

      let exTime = 45;
      if (ex.t === 'time' || ex.t === 'tiempo') { exTime = parseInt(ex.val); }
      else { exTime = (parseInt(ex.val) * 3); }

      totalSecs += sets * exTime;
      totalSecs += (sets - 1) * 60;

      // Sanitización para el modal
      const safeN = (ex.n || '').replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/\n/g, '\\n').replace(/\r/g, '');
      const safeDesc = (ex.desc || '').replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/\n/g, '\\n').replace(/\r/g, '');
      const safeImg = (ex.m && (ex.m.startsWith('http') || ex.m.startsWith('./'))) ? ex.m : '';

      html += `
         <div class="ov-item" onclick="openInfoModal('${safeN}', '${safeDesc}', '${safeImg}')" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1px solid #222; padding-bottom:10px; cursor:pointer; transition: background 0.2s;">
           <div style="padding-right:10px; flex:1;">
             <div style="color:#fff; font-weight:600; font-size:0.85rem; line-height:1.2;">${ex.n}</div>
             <div style="color:#555; text-transform:uppercase; font-size:0.65rem; letter-spacing:1px; margin-top:2px;">Atributo: ${STAT_LABELS[ex.s] || 'Base'}</div>
           </div>
           <div style="text-align:right; min-width:85px; display:flex; flex-direction:column; align-items:flex-end; gap:4px;">
             <span style="color:var(--accent-gold); font-family:'Cinzel'; font-size:0.95rem; font-weight:700;">${sets}x${ex.r.toUpperCase()}</span>
             <span style="font-size:0.6rem; color:#444;">👁️ VER</span>
           </div>
         </div>`;
    });

    totalSecs += exercises.length * 60; // transiciones y preparacion
    let estMins = Math.ceil(totalSecs / 60);
    document.getElementById('ov-time').innerText = estMins + 'm';
    document.getElementById('ov-count').innerText = exercises.length;

    let focusStatsFound = Object.keys(focusObj);
    let focusLabel = 'MIXTO';
    if (focusStatsFound.length === 1) {
      focusLabel = STAT_LABELS[focusStatsFound[0]] || 'MIXTO';
    } else if (focusStatsFound.length > 2) {
      focusLabel = 'CUERPO COMPLETO';
    } else {
      let predominant = focusStatsFound.reduce((a, b) => focusObj[a] > focusObj[b] ? a : b);
      focusLabel = STAT_LABELS[predominant] || 'MIXTO';
    }

    document.getElementById('ov-focus').innerText = focusLabel;

    // Display AI Insight
    let insightPanel = document.getElementById('trainer-insight-panel');
    let insightText = document.getElementById('trainer-insight-text');
    if (insightPanel && insightText) {
      if (window.currentAiMessage) {
        insightText.innerText = `"${window.currentAiMessage}"`;
        insightPanel.style.display = 'block';
      } else {
        insightPanel.style.display = 'none';
      }
    }

    ovList.innerHTML = html;
    document.getElementById('overview-content').style.display = 'block';
  }

  let currentFocusIndex = 0;

  function renderFocusExercises(exercises) {
    const container = document.getElementById('focus-exercises-container');
    document.getElementById('focus-finish-container').style.display = 'none';
    currentFocusIndex = 0;
    activeSetIndex = 0;

    let fullHtml = '';
    exercises.forEach((ex, index) => {
      const isTime = ex.t === 'time' || ex.t === 'tiempo';
      const numericVal = parseInt(ex.val) || 0;

      let timerBtn = '';
      if (isTime && numericVal > 0) {
        timerBtn = `<div style="display:flex; flex-direction:column; gap:10px; margin-bottom: 12px; width:100%;">
            <button class="btn-secondary" style="border-color:var(--accent-gold); color:var(--accent-gold); width:100%; padding:14px 0; font-size:0.95rem; font-weight:800; border-width:2px; letter-spacing:1px; margin-top:0;" onclick="openTimer(${numericVal})">⏱️ TEMPORIZADOR (${numericVal}s)</button>
         </div>`;
      }

      const safeImg = ex.m && (ex.m.startsWith('http') || ex.m.startsWith('./')) ? ex.m : '';
      const safeDesc = (ex.desc || '').replace(/'/g, "\\\\'").replace(/"/g, '&quot;').replace(/\n/g, '\\n').replace(/\r/g, '');
      const safeN = (ex.n || '').replace(/'/g, "\\\\'").replace(/"/g, '&quot;').replace(/\n/g, '\\n').replace(/\r/g, '');
      const altBtn = (ex.alt && !window.isExamRoutine)
        ? `<button class="btn-secondary" style="border-color:var(--accent-red); color:#ff5555; width:100%; padding:12px 0; font-weight:700; margin-top:0;" onclick="mutateExercise(${index}, '${ex.id}')">🔄 ADAPTAR TÉCNICA</button>`
        : '';

      const baseLvl = ex.lvl_min || 1;
      const baseXP = Math.round(Math.max(20, baseLvl * 1.5 + ex.sets * 2));
      const xpReward = window.isExamRoutine ? Math.round(baseXP * 1.5) : baseXP;

      // Generar indicadores de series
      let dotsHtml = '';
      for (let s = 0; s < ex.sets; s++) {
        dotsHtml += `<div class="set-dot ${s === 0 ? 'active' : ''}" id="ex-${index}-set-${s}"></div>`;
      }

      fullHtml += `
        <div class="exercise-card focus-card" id="ex-${index}" style="position:absolute; width:100%; height:100%; left:0; top:0; background:none; border:none; box-shadow:none; padding:10px; opacity: ${index === 0 ? 1 : 0}; pointer-events: ${index === 0 ? 'all' : 'none'}; transform: ${index === 0 ? 'translateX(0)' : 'translateX(50px)'}; transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.4s ease; display:flex; flex-direction:column; align-items:center; text-align:center; box-sizing:border-box; justify-content:center;">

          <div style="font-size:1.4rem; color:var(--accent-gold); font-family:'Cinzel'; margin-bottom:5px; text-shadow:0 0 10px rgba(255,215,0,0.3); font-weight:bold; line-height:1.2;">${ex.n}</div>
          <div style="background:#111; color:var(--accent-gold); padding:4px 10px; border-radius:4px; font-size:0.7rem; font-family:'Inter'; letter-spacing:1px; margin-bottom:12px; border:1px solid #333; font-weight:bold;">${STAT_LABELS[ex.s || 'str']}</div>
          
          <div style="font-size:1.15rem; margin-bottom:12px; color:#fff; font-weight:900; letter-spacing:1px; background:#161616; padding:10px 20px; border-radius:8px; border:1px dashed #333; width:100%;">
            ${ex.sets} SERIES ✕ ${ex.r.toUpperCase()}
          </div>

          <!-- Puntos de progreso de series -->
          <div class="set-dots-container">
            ${dotsHtml}
          </div>
          
          <div style="display:flex; flex-direction:column; gap:10px; width:100%; max-width:350px;">
            ${timerBtn}
            <button class="btn-secondary" style="width:100%; border-color:#333; padding:12px 0; font-weight:800; margin-top:0;" onclick="openInfoModal('${safeN}', '${safeDesc}', '${safeImg}')">👁️ INSTRUCCIONES</button>
            ${altBtn}
            
            <div style="margin-top: 10px;">
              <button id="ex-${index}-action-btn" class="btn-complete-massive focus-complete-btn" onclick="logActiveSet(${index}, '${ex.s || 'str'}', ${xpReward})" style="width:100%; padding:18px 0; font-size:1.2rem;">✔️ COMPLETAR SERIE 1</button>
            </div>
          </div>
        </div>`;
    });

    container.innerHTML = fullHtml;
    updateFocusProgress();
    requestWakeLock(); // Screen on when starting routine focus!
    
    // Sensei speaks introductory line
    setTimeout(() => {
      speakSensei(`Comenzamos la forja física de hoy, ${player.name}. Tu voluntad guiará tu cuerpo. Primer ejercicio: ${exercises[0].n}. Prepárate.`);
    }, 600);
  }

  function updateFocusProgress() {
    let el = document.getElementById('focus-progress-text');
    if (el) el.innerText = `EJERCICIO ${currentFocusIndex + 1} DE ${currentRoutine.length}`;
  }

  window.logActiveSet = function(exIndex, statAlias, xpReward) {
    if (navigator.vibrate) navigator.vibrate(50);
    const ex = currentRoutine[exIndex];
    const totalSets = ex.sets;
    
    // Complete active set dot
    const dot = document.getElementById(`ex-${exIndex}-set-${activeSetIndex}`);
    if (dot) {
      dot.classList.remove('active');
      dot.classList.add('completed');
    }
    
    // Sound
    playBeep();
    
    activeSetIndex++;
    
    if (activeSetIndex < totalSets) {
      // Highlight next set
      const nextDot = document.getElementById(`ex-${exIndex}-set-${activeSetIndex}`);
      if (nextDot) nextDot.classList.add('active');
      
      // Update action button text
      const btn = document.getElementById(`ex-${exIndex}-action-btn`);
      if (btn) btn.innerHTML = `✔️ COMPLETAR SERIE ${activeSetIndex + 1}`;
      
      // Trigger rest timer HUD — adaptive rest based on player rank
      const _rankIdx = player.rankIndex || 0;
      const _restSecs = _rankIdx >= 7 ? 45 : _rankIdx >= 4 ? 60 : 90;
      triggerRestTimer(_restSecs);
    } else {
      // Completed all sets! Show transitional button
      const btn = document.getElementById(`ex-${exIndex}-action-btn`);
      if (btn) {
        btn.innerHTML = `🥊 TRANSICIÓN AL EJERCICIO (+${xpReward} XP)`;
        btn.style.background = 'linear-gradient(135deg, var(--accent-gold), #b8860b)';
        btn.style.color = '#000';
        btn.style.borderColor = 'var(--accent-gold)';
        btn.style.textShadow = 'none';
        btn.onclick = () => {
          activeSetIndex = 0;
          completeFocusTask(exIndex, statAlias, xpReward);
        };
      }
      
      // Whoosh: all sets of this exercise are done
      playWhoosh();
      // Sensei speaks technique complete
      speakSensei(`Técnica concluida con honor. Prepárate para el siguiente reto.`);
    }
  };

  window.completeFocusTask = function (index, statAlias, xpReward) {
    if (navigator.vibrate) navigator.vibrate(50);
    let s = "str";
    if (statAlias.toLowerCase().includes("spd")) s = "spd";
    if (statAlias.toLowerCase().includes("flex")) s = "flex";
    if (statAlias.toLowerCase().includes("end")) s = "end";

    let xp = (typeof xpReward === 'number' && xpReward > 0) ? xpReward : 20;

    // Apply equipped relic bonuses to XP
    let xpBonusDesc = "";
    if (player.equippedRelic === 'relic_oni' && s === 'str') {
      let bonus = Math.round(xp * 0.15);
      xp += bonus;
      xpBonusDesc = ` (+${bonus} XP Máscara Oni 👹)`;
    } else if (player.equippedRelic === 'relic_blade' && s === 'end') {
      let bonus = Math.round(xp * 0.15);
      xp += bonus;
      xpBonusDesc = ` (+${bonus} XP Hoja Ancestral 🗡️)`;
    } else if (player.equippedRelic === 'relic_crown') {
      let bonus = Math.round(xp * 0.20);
      xp += bonus;
      xpBonusDesc = ` (+${bonus} XP Corona Monarca 👑)`;
    }

    gainXP(xp, s);

    if (!window.sessionState || !window.sessionState.active) {
      showNotification(`Tu disciplina ha forjado +${xp} XP en ${STAT_LABELS[s]}${xpBonusDesc}.\n\nEl dolor es debilidad abandonando el cuerpo.`, "🥊 Esfuerzo Honrado");
    }

    let currentCard = document.getElementById(`ex-${index}`);
    if (currentCard) {
      currentCard.style.opacity = '0';
      currentCard.style.transform = 'translateX(-50px)';
      currentCard.style.pointerEvents = 'none';
    }

    currentFocusIndex++;

    if (currentFocusIndex >= currentRoutine.length) {
      // All exercises complete — show finish overlay
      let finContainer = document.getElementById('focus-finish-container');
      if (finContainer) {
        finContainer.style.display = 'flex';
        finContainer.classList.add('pulse-glow');
      }
      let rwContainer = document.getElementById('victory-rewards');
      if (rwContainer) rwContainer.style.display = 'flex';

      // ─── CALCULAR Y ACTUALIZAR RACHA ─────────────────────────────────────
      const todayStr = new Date().toLocaleDateString();
      const yesterdayStr = new Date(Date.now() - 86400000).toLocaleDateString();
      let lastWorkoutDateStr = "";
      if (workoutHistory && workoutHistory.length > 0) {
        let firstEntry = workoutHistory[0];
        if (firstEntry && firstEntry.date) {
          lastWorkoutDateStr = firstEntry.date.split(' ')[0];
        }
      }

      let rachaSalvada = false;
      if (lastWorkoutDateStr === todayStr) {
        // Ya entrenó hoy, la racha no cambia
      } else if (lastWorkoutDateStr === yesterdayStr || lastWorkoutDateStr === "") {
        // Entrenó ayer o es su primer entrenamiento, incrementa la racha
        player.streak = (player.streak || 0) + 1;
      } else {
        // Rompió la racha (más de 1 día sin entrenar)
        // Lógica de Salvaguarda de Racha (relic_fang)
        if (player.equippedRelic === 'relic_fang') {
          player.equippedRelic = null;
          player.unlockedItems = player.unlockedItems.filter(i => i !== 'relic_fang');
          rachaSalvada = true;
          player.streak = (player.streak || 0) + 1;
        } else {
          player.streak = 1;
        }
      }

      // ─── CALCULAR Y ENSEÑAR MONEDAS GANADAS ──────────────────────────────
      const baseCoins = 50 + (currentRoutine.length * 15);
      
      // relic_incense doubles streak bonuses
      let streakBonusMultiplier = 10;
      let incenseGlow = "";
      if (player.equippedRelic === 'relic_incense') {
        streakBonusMultiplier = 20;
        incenseGlow = " 🕯️";
      }
      
      const streakBonus = Math.min(player.equippedRelic === 'relic_incense' ? 100 : 50, (player.streak || 0) * streakBonusMultiplier);
      let coinsEarned = baseCoins + streakBonus;
      let relicBonusCoins = 0;
      let relicBonusDesc = "";

      // Relics multipliers
      if (player.equippedRelic === 'relic_magatama') {
        relicBonusCoins = Math.round(coinsEarned * 0.25);
        coinsEarned += relicBonusCoins;
        relicBonusDesc = ` (+${relicBonusCoins} por Magatama 🌀)`;
      } else if (player.equippedRelic === 'relic_crown') {
        relicBonusCoins = Math.round(coinsEarned * 0.20);
        coinsEarned += relicBonusCoins;
        relicBonusDesc = ` (+${relicBonusCoins} por Corona 👑)`;
      }

      player.coins = (player.coins || 0) + coinsEarned;

      // Update victory UI
      const rewardCoinsEl = document.getElementById('reward-coins');
      if (rewardCoinsEl) {
        rewardCoinsEl.textContent = `+${coinsEarned}`;
        
        let detailEl = document.getElementById('reward-coins-detail');
        if (!detailEl) {
          detailEl = document.createElement('div');
          detailEl.id = 'reward-coins-detail';
          detailEl.style.fontSize = '0.55rem';
          detailEl.style.color = '#888';
          detailEl.style.marginTop = '4px';
          rewardCoinsEl.parentNode.appendChild(detailEl);
        }
        detailEl.innerHTML = `Base ${baseCoins} + Racha ${streakBonus}${relicBonusDesc}`;
      }
      
      const rewardStreakEl = document.getElementById('reward-streak');
      if (rewardStreakEl) {
        rewardStreakEl.textContent = `Racha x${player.streak || 1}${incenseGlow}`;
      }

      savePlayer(); // Persistir de inmediato

      if (rachaSalvada) {
        showNotification("El Colmillo del Primer Dragón se ha sacrificado para proteger tu racha. ¡No descuides tu entrenamiento!", "🛡️ Racha Salvada");
      }

      // Release Wake Lock & celebrate
      releaseWakeLock();
      initAudio();
      playFanfare();
      throwConfetti();
      speakSensei(`Sesión completada con honor, ${player.name}. El Templo reconoce tu disciplina. Descansa y vuelve más fuerte.`);
    } else {
      // Trigger a 90-second recovery timer between exercises!
      triggerRestTimer(90, true);

      // Reveal the next exercise card
      let nextCard = document.getElementById(`ex-${currentFocusIndex}`);
      if (nextCard) {
        nextCard.style.opacity = '1';
        nextCard.style.transform = 'translateX(0)';
        nextCard.style.pointerEvents = 'all';
      }
      updateFocusProgress();
      const nextEx = currentRoutine[currentFocusIndex];
      if (nextEx) {
        // Announce next exercise details after a brief delay so it doesn't collide with the transition beep
        setTimeout(() => {
          speakSensei(`Prepárate para el siguiente reto: ${nextEx.n}. Serán ${nextEx.sets} series de ${nextEx.r}.`);
        }, 4000);
      }
    }
  }

  window.mutateExercise = function (index, baseId) {
    let exObj = EXERCISE_DB.find(x => x.id === baseId);
    if (exObj && exObj.alt) {
      let current = currentRoutine[index];
      current.n = `${exObj.alt.n} (${exObj.alt.real})`;
      current.desc = exObj.alt.desc;
      current.m = exObj.alt.m || "";
      current.alt = null; // ya fue mutado
      renderFocusExercises(currentRoutine); // re-render

      for (let i = 0; i < currentRoutine.length; i++) {
        let c = document.getElementById(`ex-${i}`);
        if (c) {
          if (i === currentFocusIndex) {
            c.style.opacity = '1'; c.style.transform = 'translateX(0)'; c.style.pointerEvents = 'all';
          } else {
            c.style.opacity = '0'; c.style.transform = 'translateX(50px)'; c.style.pointerEvents = 'none';
          }
        }
      }
      showNotification("El Oráculo ha adaptado la técnica a tus circunstancias.", "Mutación Física");
    }
  }

  // AUDIO RADIO — Event Delegation: escuchar en el CONTENEDOR para que los botones
  // que nacen ocultos (Taiko/Synth) también funcionen al ser revelados por el bazar
  const audio = document.getElementById('audio-player');
  const radioContainer = document.querySelector('.radio-controls');
  if (radioContainer) {
    radioContainer.addEventListener('click', function (e) {
      const btn = e.target.closest('.radio-btn');
      if (!btn) return;

      if (navigator.vibrate) navigator.vibrate(50);
      console.log("ZenRyu: Radio click -> ", btn.innerText.trim());

      // Reset UI
      document.querySelectorAll('.radio-btn').forEach(b => b.classList.remove('active'));

      if (btn.id === 'radio-stop') {
        audio.pause();
        return;
      }

      btn.classList.add('active');
      const trackUrl = btn.getAttribute('data-url');

      // Asignación directa y play — NO usar load() entre click y play()
      audio.src = trackUrl;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          console.log("ZenRyu: ✅ Audio OK ->", trackUrl);
        }).catch(err => {
          console.error("ZenRyu: ❌ Audio blocked:", err);
          showNotification("La Emisora Astral ha sido bloqueada. Toca otra parte de la pantalla primero e intenta de nuevo.", "Error de Audio");
        });
      }
    });
  }

  // ====== BAZAR DEL ORÁCULO ======
  let currentStoreTab = 'aura';

  window.openStoreModal = function () {
    document.getElementById('store-coin-display').innerText = player.coins || 0;
    // Reset to first tab
    currentStoreTab = 'aura';
    const firstTab = document.querySelector('.store-tab');
    if (firstTab) switchStoreTab('aura', firstTab);
    window.renderStore();
    openModal('store-modal');
  };

  window.switchStoreTab = function (category, el) {
    currentStoreTab = category;
    document.querySelectorAll('.store-tab').forEach(t => {
      t.classList.remove('active-tab');
      t.style.color = '#888';
      t.style.borderBottomColor = 'transparent';
    });
    el.classList.add('active-tab');
    el.style.color = 'var(--accent-gold)';
    el.style.borderBottomColor = 'var(--accent-gold)';
    window.renderStore();
  };

  window.renderStore = function () {
    let container = document.getElementById('store-items-container');
    if (!container) return;
    container.innerHTML = '';

    // Filtrar por categoría actual
    const filteredItems = STORE_ITEMS.filter(item => {
      // Category handling
      if (currentStoreTab === 'aura') return item.type === 'aura';
      if (currentStoreTab === 'relic') return item.type === 'relic';
      return item.type === currentStoreTab;
    });

    if (filteredItems.length === 0) {
      container.innerHTML = '<p style="text-align:center; color:#555; font-style:italic; padding:40px;">No hay objetos disponibles en esta sección por ahora.</p>';
      return;
    }

    filteredItems.forEach(item => {
      let unl = window.player ? window.player.unlockedItems.includes(item.id) : player.unlockedItems.includes(item.id);
      let isEquipped = window.player ? (window.player.activeAura === item.id) : (player.activeAura === item.id);
      let actionBtn = '';

      if (!unl) {
        actionBtn = `<button class="btn-primary" onclick="buyStoreItem('${item.id}')" style="width:100%; font-size:0.8rem; background:#333; color:var(--accent-gold); border-color:var(--accent-gold);">🪙 COMPRAR (${item.price})</button>`;
      } else {
        if (item.type === 'aura') {
          actionBtn = `<button class="btn-secondary" onclick="equipAura('${item.id}'); renderStore();" style="width:100%; font-size:0.8rem; background:${isEquipped ? 'var(--accent-gold)' : '#111'}; color:${isEquipped ? '#000' : 'var(--accent-gold)'};">${isEquipped ? 'EQUIPADA' : 'EQUIPAR'}</button>`;
        } else if (item.type === 'book') {
          actionBtn = `<button class="btn-secondary" onclick="openBookReader('${item.id}', 'store-modal');" style="width:100%; font-size:0.8rem; border-color:#00ffff; color:#00ffff;">LEER LIBRO 📖</button>`;
        } else if (item.type === 'relic') {
          let isEq = player.equippedRelic === item.id;
          actionBtn = `<button class="btn-secondary" onclick="toggleRelic('${item.id}'); renderStore();" style="width:100%; font-size:0.8rem; background:${isEq ? 'var(--accent-gold)' : '#111'}; color:${isEq ? '#000' : 'var(--accent-gold)'}; border-color:${isEq ? 'var(--accent-gold)' : '#555'};">${isEq ? 'EQUIPADA' : 'EQUIPAR'}</button>`;
        } else if (item.type === 'music') {
          actionBtn = `<button class="btn-secondary" disabled style="width:100%; font-size:0.8rem; opacity:0.8; cursor:default; background:#000; border-color:#555; color:#888;">USAR EN EMISORA ASTRAL</button>`;
        } else {
          actionBtn = `<button class="btn-secondary" disabled style="width:100%; font-size:0.8rem; opacity:0.5; cursor:not-allowed;">OBTENIDO</button>`;
        }
      }

      container.innerHTML += `
      <div class="store-item-card">
        <div class="store-item-icon">${item.icon}</div>
        <div class="store-item-details">
          <h4>${item.name}</h4>
          <p>${item.desc}</p>
          ${actionBtn}
        </div>
      </div>
    `;
    });
  };

  window.buyStoreItem = function (id) {
    let item = STORE_ITEMS.find(i => i.id === id);
    if (!item) return;
    if ((player.coins || 0) < item.price) {
      showNotification("No tienes suficientes Monedas Zen. Sigue forjando tu espíritu en el dojo para amasar fortuna.", "🪙 Monedas Insuficientes");
      return;
    }
    player.coins -= item.price;
    player.unlockedItems.push(item.id);
    savePlayer();
    document.getElementById('store-coin-display').innerText = player.coins;
    if (window.UISoundEngine) window.UISoundEngine.playSwoosh();

    // Custom action triggers on buy
    if (item.type === 'aura') equipAura(id);

    applyInventory();
    renderStore();

    const rwCoins = document.getElementById('player-coins');
    if (rwCoins) rwCoins.innerText = player.coins;
  };

  window.equipAura = function (id) {
    if (player.activeAura === id) {
      player.activeAura = null;
    } else {
      player.activeAura = id;
    }
    savePlayer();
    applyInventory();
    renderStore();
  };

  window.toggleRelic = function (id) {
    if (player.equippedRelic === id) {
      player.equippedRelic = null;
      showNotification("Reliquia desequipada. Los efectos pasivos ya no tienen vigor.", "⚗️ Vitrina de Reliquias");
    } else {
      player.equippedRelic = id;
      let r = STORE_ITEMS.find(item => item.id === id);
      let name = r ? r.name : "Reliquia";
      showNotification(`${name} equipada. Sus efectos pasivos se activarán en tus entrenamientos.`, "⚗️ Reliquia Activa");
    }
    savePlayer();
    applyInventory();
    renderStore();
    if (window.renderProfileVault) renderProfileVault();
  };

  window.applyInventory = function () {
    if (!player.unlockedItems) player.unlockedItems = [];

    // Reset advanced themes
    document.body.classList.remove('theme-boreal', 'theme-solar', 'theme-sombra', 'theme-sangre');
    let weatherLayer = document.getElementById('weather-layer');
    if (weatherLayer) weatherLayer.innerHTML = '';

    if (player.activeAura) {
      let aura = STORE_ITEMS.find(i => i.id === player.activeAura);
      if (aura && aura.meta) {
        document.documentElement.style.setProperty('--accent-gold', aura.meta);
        document.documentElement.style.setProperty('--accent-gold-glow', aura.meta + '66');

        // Apply visual themes & particles
        if (aura.id === 'aura_hielo') {
          document.body.classList.add('theme-boreal');
          if (weatherLayer) {
            for(let i=0; i<30; i++) {
              let w = Math.random() * 5 + 2;
              weatherLayer.innerHTML += `<div class="snow-flake" style="width:${w}px; height:${w}px; left:${Math.random()*100}vw; animation-duration:${Math.random()*3 + 2}s; animation-delay:-${Math.random()*5}s"></div>`;
            }
          }
        } else if (aura.id === 'aura_solar') {
          document.body.classList.add('theme-solar');
          if (weatherLayer) {
            for(let i=0; i<25; i++) {
              let w = Math.random() * 4 + 2;
              weatherLayer.innerHTML += `<div class="ember" style="width:${w}px; height:${w}px; left:${Math.random()*100}vw; animation-duration:${Math.random()*4 + 3}s; animation-delay:-${Math.random()*5}s"></div>`;
            }
          }
        } else if (aura.id === 'aura_sombra') {
          document.body.classList.add('theme-sombra');
          if (weatherLayer) {
            for(let i=0; i<15; i++) {
              let w = Math.random() * 80 + 30; // Larger shadowy blobs
              weatherLayer.innerHTML += `<div class="shadow-blob" style="width:${w}px; height:${w}px; left:${Math.random()*100}vw; top:${Math.random()*100}vh; animation-duration:${Math.random()*5 + 4}s; animation-delay:-${Math.random()*5}s"></div>`;
            }
          }
        } else if (aura.id === 'aura_sangre') {
          document.body.classList.add('theme-sangre');
          if (weatherLayer) {
            for(let i=0; i<35; i++) {
              let w = Math.random() * 5 + 2;
              weatherLayer.innerHTML += `<div class="blood-particle" style="width:${w}px; height:${w}px; left:${Math.random()*100}vw; animation-duration:${Math.random()*3 + 2}s; animation-delay:-${Math.random()*5}s"></div>`;
            }
          }
        }
      }
    } else {
      document.documentElement.style.setProperty('--accent-gold', '#ffd700');
      document.documentElement.style.setProperty('--accent-gold-glow', 'rgba(255, 215, 0, 0.4)');
    }

    // Aura Pulse: add pulsing glow to avatar when an aura is equipped
    const avatarEl = document.getElementById('avatar');
    if (avatarEl) {
      if (player.activeAura) {
        const auraMeta = STORE_ITEMS.find(i => i.id === player.activeAura);
        if (auraMeta && auraMeta.meta) {
          document.documentElement.style.setProperty('--avatar-aura-color', auraMeta.meta + 'bb');
          avatarEl.classList.add('avatar-aura-active');
        } else {
          avatarEl.classList.remove('avatar-aura-active');
        }
      } else {
        document.documentElement.style.setProperty('--avatar-aura-color', 'rgba(255,215,0,0.4)');
        avatarEl.classList.remove('avatar-aura-active');
      }
    }

    const taikoBtn = document.getElementById('audio-taiko');
    if (taikoBtn) taikoBtn.style.display = player.unlockedItems.includes('mus_taiko') ? 'inline-block' : 'none';
    const synthBtn = document.getElementById('audio-synth');
    if (synthBtn) synthBtn.style.display = player.unlockedItems.includes('mus_synth') ? 'inline-block' : 'none';
    const ambientBtn = document.getElementById('audio-ambient');
    if (ambientBtn) ambientBtn.style.display = player.unlockedItems.includes('mus_ambient') ? 'inline-block' : 'none';
    const epicBtn = document.getElementById('audio-epic');
    if (epicBtn) epicBtn.style.display = player.unlockedItems.includes('mus_epic') ? 'inline-block' : 'none';
    const lofiBtn = document.getElementById('audio-lofi');
    if (lofiBtn) lofiBtn.style.display = player.unlockedItems.includes('mus_lofi') ? 'inline-block' : 'none';
    const tribalBtn = document.getElementById('audio-tribal');
    if (tribalBtn) tribalBtn.style.display = player.unlockedItems.includes('mus_tribal') ? 'inline-block' : 'none';
  };

  // ====== SISTEMA DE LECTURA EPUB (EPUB.JS) ======
  let currentBook = null;
  let currentRendition = null;
  let currentBookId = null;
  let currentBookTheme = 'dark';
  let openedFromModal = null;
  let isBookLoading = false;
  let isPageTurning = false;

  window.closeBookReader = function () {
    isBookLoading = false;
    isPageTurning = false;

    // Immediately close modal and restore previous modal to make navigation instantaneous
    try {
      closeModal('reader-modal');
    } catch(e) {
      console.error("ZenRyu: error calling closeModal in closeBookReader:", e);
    }

    if (openedFromModal) {
      try {
        openModal(openedFromModal);
      } catch(e) {
        console.error("ZenRyu: error opening previous modal in closeBookReader:", e);
      }
      openedFromModal = null;
    }

    // Clean up viewer DOM immediately so user doesn't see old book content next time
    const viewer = document.getElementById('book-viewer');
    if (viewer) {
      viewer.innerHTML = '';
      viewer.className = '';
    }

    // Secure loading indicator check
    const loadingEl = document.getElementById('reader-loading');
    if (loadingEl) {
      loadingEl.style.display = 'none';
    }

    // Destroy book asynchronously to prevent blocking the UI thread or crashes during closing transition
    if (currentBook) {
      const bookToDestroy = currentBook;
      currentBook = null;
      currentRendition = null;
      setTimeout(() => {
        try {
          bookToDestroy.destroy();
        } catch(e) {
          console.warn("ZenRyu: non-blocking error destroying book asynchronously:", e);
        }
      }, 100);
    }
  };

  window.openBookReader = function (bookId, fromModal) {
    if (isBookLoading) return; // Prevent concurrent opens
    
    let item = STORE_ITEMS.find(i => i.id === bookId);
    if (!item) return;

    openedFromModal = fromModal || null;
    currentBookId = bookId;
    isBookLoading = true;
    
    const titleEl = document.getElementById('reader-book-title');
    if (titleEl) titleEl.innerText = item.name.toUpperCase();
    
    const loadingEl = document.getElementById('reader-loading');
    if (loadingEl) loadingEl.style.display = 'block';

    if (openedFromModal) {
      closeModal(openedFromModal);
    }

    // Clear previous book
    if (currentBook) {
      try { currentBook.destroy(); } catch(e) {
        console.error("ZenRyu: error destroying previous book:", e);
      }
      currentBook = null;
      currentRendition = null;
    }

    // Clear previous view container and recreate the page-turn overlay
    const viewer = document.getElementById('book-viewer');
    if (viewer) {
      viewer.innerHTML = '';
      const overlay = document.createElement('div');
      overlay.id = 'reader-page-overlay';
      overlay.className = 'reader-page-overlay';
      viewer.appendChild(overlay);
    }
    
    openModal('reader-modal');

    function initEpubFromBuffer(arrayBuffer) {
      try {
        currentBook = ePub(arrayBuffer, { type: 'binary' });

        currentRendition = currentBook.renderTo(viewer, {
          width: "100%",
          height: "100%",
          spread: "none",
          flow: "paginated"
        });

        // Restore reading progress if available
        let savedPosition = player.readingProgress ? player.readingProgress[bookId] : null;
        if (savedPosition) {
          currentRendition.display(savedPosition)
            .then(() => { isBookLoading = false; })
            .catch(() => {
              currentRendition.display().finally(() => { isBookLoading = false; });
            });
        } else {
          currentRendition.display().finally(() => { isBookLoading = false; });
        }

        // Hide loading on first render
        currentRendition.on("rendered", () => {
          const loadEl = document.getElementById('reader-loading');
          if (loadEl) loadEl.style.display = 'none';
          applyReaderStyles();
          changeReaderTheme(currentBookTheme);
        });

        // Read TOC for chapter navigation
        currentBook.loaded.navigation.then(nav => {
          const select = document.getElementById('reader-chapter-select');
          if (select) {
            select.innerHTML = '<option value="">— Capítulos —</option>';
            nav.toc.forEach(chapter => {
              let opt = document.createElement('option');
              opt.value = chapter.href;
              opt.innerText = chapter.label.trim();
              select.appendChild(opt);
            });
            select.onchange = function () {
              if (select.value) currentRendition.display(select.value);
            };
          }
        }).catch(e => console.log("ZenRyu: TOC load failed:", e));

        // Save position + update progress on page turn
        currentRendition.on("relocated", location => {
          if (!player.readingProgress) player.readingProgress = {};
          player.readingProgress[bookId] = location.start.cfi;
          savePlayer();

          if (currentBook.locations && typeof currentBook.locations.length === 'function' && currentBook.locations.length() > 0) {
            let pct = Math.round(currentBook.locations.percentageFromCfi(location.start.cfi) * 100);
            const pctEl = document.getElementById('reader-progress-percent');
            if (pctEl) pctEl.innerText = `Progreso: ${pct}%`;
          }

          const chTitleEl = document.getElementById('reader-chapter-title');
          if (chTitleEl && location.start.index !== undefined) {
            chTitleEl.innerText = "Sección " + (location.start.index + 1);
          }

          const select = document.getElementById('reader-chapter-select');
          if (select && location.start.href) {
            let matchingOpt = Array.from(select.options).find(o => o.value && location.start.href.includes(o.value));
            if (matchingOpt) select.value = matchingOpt.value;
          }
        });

        // Generate locations for percentage tracking
        currentBook.ready.then(() => currentBook.locations.generate(1024))
          .catch(e => console.log("ZenRyu: locations generation failed:", e));

      } catch (err) {
        console.error("ZenRyu: Error rendering EPUB:", err);
        isBookLoading = false;
        const loadEl = document.getElementById('reader-loading');
        if (loadEl) loadEl.style.display = 'none';
        if (viewer) {
          viewer.innerHTML = '<p style="color:#f44;text-align:center;padding:40px;font-size:0.9rem;">No se pudo renderizar el libro.<br>Intenta cerrar y volver a abrir.</p>';
        }
      }
    }

    // Fetch the EPUB as ArrayBuffer (evita problemas de CORS y parsing por ruta relativa)
    fetch(item.meta)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.arrayBuffer();
      })
      .then(buffer => {
        initEpubFromBuffer(buffer);
      })
      .catch(err => {
        console.error("ZenRyu: Failed to fetch EPUB:", err);
        isBookLoading = false;
        const loadEl = document.getElementById('reader-loading');
        if (loadEl) loadEl.style.display = 'none';
        if (viewer) {
          viewer.innerHTML = `<p style="color:#f44;text-align:center;padding:40px;font-size:0.9rem;">No se pudo cargar "<strong>${item.name}</strong>".<br><small style="color:#888;">${err.message}</small></p>`;
        }
        showNotification("Error al cargar el tomo. Asegúrate de estar conectado o reinicia la app.", "⚠️ Error de Lectura");
      });
  };

  window.applyReaderStyles = function () {
    if (!currentRendition) return;
    const fontEl = document.getElementById('reader-font-select');
    const sizeEl = document.getElementById('reader-size-select');
    if (!fontEl || !sizeEl) return;
    
    const font = fontEl.value;
    const size = sizeEl.value;

    currentRendition.themes.font(font);
    currentRendition.themes.fontSize(size);
  };

  window.changeReaderTheme = function (theme) {
    currentBookTheme = theme;
    const viewer = document.getElementById('book-viewer');
    const viewport = document.getElementById('reader-viewport');
    const modalContent = document.querySelector('#reader-modal .modal-content');
    
    let bgColor = '#121212'; // Page color
    let vpColor = '#070707'; // Desk/viewport color
    let textColor = '#e0e0e0';
    let borderColor = 'rgba(255, 215, 0, 0.15)'; // gold border for page

    if (theme === 'sepia') {
      bgColor = '#fdf6e3';
      vpColor = '#eee8d5';
      textColor = '#5c4033';
      borderColor = 'rgba(92, 64, 51, 0.15)';
    } else if (theme === 'light') {
      bgColor = '#ffffff';
      vpColor = '#f0f0f0';
      textColor = '#2c2c2c';
      borderColor = 'rgba(0, 0, 0, 0.1)';
    }

    if (viewer) {
      viewer.style.backgroundColor = bgColor;
      viewer.style.borderColor = borderColor;
    }
    if (viewport) {
      viewport.style.backgroundColor = vpColor;
    }
    if (modalContent) {
      modalContent.style.backgroundColor = vpColor;
      modalContent.style.color = textColor;
    }

    // Set CSS custom variable on root for page-turn overlay background color
    document.documentElement.style.setProperty('--reader-bg-color', bgColor);

    // Apply active borders to toolbar theme buttons
    const darkBtn = document.getElementById('theme-btn-dark');
    const sepiaBtn = document.getElementById('theme-btn-sepia');
    const lightBtn = document.getElementById('theme-btn-light');
    if (darkBtn && sepiaBtn && lightBtn) {
      darkBtn.style.border = '1px solid #333';
      sepiaBtn.style.border = '1px solid #333';
      lightBtn.style.border = '1px solid #333';
      darkBtn.style.boxShadow = 'none';
      sepiaBtn.style.boxShadow = 'none';
      lightBtn.style.boxShadow = 'none';

      if (theme === 'dark') {
        darkBtn.style.border = '1.5px solid var(--accent-gold)';
        darkBtn.style.boxShadow = '0 0 8px var(--accent-gold-glow)';
      } else if (theme === 'sepia') {
        sepiaBtn.style.border = '1.5px solid #8b5a2b';
        sepiaBtn.style.boxShadow = '0 0 8px rgba(139, 90, 43, 0.3)';
      } else if (theme === 'light') {
        lightBtn.style.border = '1.5px solid #111';
        lightBtn.style.boxShadow = '0 0 8px rgba(0, 0, 0, 0.1)';
      }
    }

    if (currentRendition) {
      currentRendition.themes.default({
        body: {
          background: bgColor + ' !important',
          color: textColor + ' !important',
          'font-family': "inherit !important",
          'padding': '0 25px !important'
        },
        p: {
          color: textColor + ' !important',
          'line-height': '1.6 !important',
          'margin-bottom': '1.2em !important'
        },
        h1: { color: 'var(--accent-gold) !important', 'font-family': "'Cinzel', serif !important" },
        h2: { color: 'var(--accent-gold) !important', 'font-family': "'Cinzel', serif !important" },
        h3: { color: 'var(--accent-gold) !important', 'font-family': "'Cinzel', serif !important" }
      });
      // Re-apply typography adjustments
      applyReaderStyles();
    }
  };

  window.readerNextPage = function () {
    if (!currentRendition || isPageTurning || isBookLoading) return;
    
    const overlay = document.getElementById('reader-page-overlay');
    if (!overlay) {
      currentRendition.next();
      return;
    }

    isPageTurning = true;
    overlay.classList.remove('flip-next-active', 'flip-prev-active');
    void overlay.offsetWidth; // force reflow
    overlay.classList.add('flip-next-active');

    setTimeout(() => {
      if (!currentRendition) {
        isPageTurning = false;
        return;
      }
      currentRendition.next().catch(err => {
        console.error("ZenRyu: next page load error:", err);
      });
    }, 250);

    setTimeout(() => {
      overlay.classList.remove('flip-next-active');
      isPageTurning = false;
    }, 500);
  };

  window.readerPrevPage = function () {
    if (!currentRendition || isPageTurning || isBookLoading) return;
    
    const overlay = document.getElementById('reader-page-overlay');
    if (!overlay) {
      currentRendition.prev();
      return;
    }

    isPageTurning = true;
    overlay.classList.remove('flip-next-active', 'flip-prev-active');
    void overlay.offsetWidth; // force reflow
    overlay.classList.add('flip-prev-active');

    setTimeout(() => {
      if (!currentRendition) {
        isPageTurning = false;
        return;
      }
      currentRendition.prev().catch(err => {
        console.error("ZenRyu: prev page load error:", err);
      });
    }, 250);

    setTimeout(() => {
      overlay.classList.remove('flip-prev-active');
      isPageTurning = false;
    }, 500);
  };

  // ====== PERFIL Y BÓVEDA ======
  window.openProfileModal = function () {
    renderProfileVault();
    openModal('profile-modal');
  };

  window.switchProfileTab = function (tabId, el) {
    document.querySelectorAll('.profile-tab').forEach(t => {
      t.classList.remove('active-tab');
      t.style.color = '#888';
      t.style.borderBottomColor = 'transparent';
    });
    el.classList.add('active-tab');
    el.style.color = 'var(--accent-gold)';
    el.style.borderBottomColor = 'var(--accent-gold)';

    document.querySelectorAll('.profile-tab-content').forEach(c => c.style.display = 'none');
    document.getElementById(tabId).style.display = 'block';

    // Render heatmap lazily when the Books tab opens
    if (tabId === 'tab-books' && window.renderHeatmap) window.renderHeatmap();
  };

  window.renderProfileVault = function () {
    const auraCont = document.getElementById('tab-auras');
    const booksCont = document.getElementById('tab-books-items-container');
    const relicCont = document.getElementById('tab-relics');

    if (auraCont) auraCont.innerHTML = '<h4 style="color:#555; font-size:0.7rem; margin-bottom:15px; letter-spacing:1px; text-align:center;">AUSENCIAS Y LUCES</h4>';
    if (booksCont) booksCont.innerHTML = '<h4 style="color:#555; font-size:0.7rem; margin-bottom:15px; letter-spacing:1px; text-align:center;">BIBLIOTECA ADQUIRIDA</h4>';
    if (relicCont) relicCont.innerHTML = '<h4 style="color:#555; font-size:0.7rem; margin-bottom:15px; letter-spacing:1px; text-align:center;">VITRINA DE ARTEFACTOS</h4>';

    let hasAuras = false, hasBooks = false, hasRelics = false;

    STORE_ITEMS.forEach(item => {
      if (!player.unlockedItems.includes(item.id)) return;

      let html = `
      <div class="vault-item-card">
        <div class="vault-item-icon">${item.icon}</div>
        <div class="vault-item-details">
          <div class="vault-item-name">${item.name}</div>
          <div class="vault-item-desc">${item.desc.substring(0, 50)}...</div>
        </div>
    `;

      if (item.type === 'aura') {
        hasAuras = true;
        let isEq = player.activeAura === item.id;
        html += `<button class="btn-secondary" onclick="equipAura('${item.id}'); renderProfileVault();" style="font-size:0.6rem; padding:5px 10px; background:${isEq ? 'var(--accent-gold)' : '#000'}; color:${isEq ? '#000' : 'var(--accent-gold)'};">${isEq ? 'ACTIVA' : 'USAR'}</button></div>`;
        if (auraCont) auraCont.innerHTML += html;
      } else if (item.type === 'book') {
        hasBooks = true;
        html += `<button class="btn-secondary" onclick="openBookReader('${item.id}', 'profile-modal')" style="font-size:0.6rem; padding:5px 10px; border-color:#00ffff; color:#00ffff;">LEER</button></div>`;
        if (booksCont) booksCont.innerHTML += html;
      } else if (item.type === 'relic') {
        hasRelics = true;
        let isEq = player.equippedRelic === item.id;
        html += `<button class="btn-secondary" onclick="toggleRelic('${item.id}');" style="font-size:0.6rem; padding:5px 10px; background:${isEq ? 'var(--accent-gold)' : '#000'}; color:${isEq ? '#000' : 'var(--accent-gold)'}; border-color:${isEq ? 'var(--accent-gold)' : '#555'};">${isEq ? 'EQUIPADA' : 'EQUIPAR'}</button></div>`;
        if (relicCont) relicCont.innerHTML += html;
      }
    });

    if (!hasAuras && auraCont) auraCont.innerHTML += '<p style="color:#444; font-size:0.8rem; text-align:center; margin-top:20px;">No has adquirido esencias en el Bazar.</p>';
    if (!hasBooks && booksCont) booksCont.innerHTML += '<p style="color:#444; font-size:0.8rem; text-align:center; margin-top:20px;">No has adquirido tomos de sabiduría en el Bazar.</p>';
    if (!hasRelics && relicCont) relicCont.innerHTML += '<p style="color:#444; font-size:0.8rem; text-align:center; margin-top:20px;">Tu vitrina está vacía.</p>';
  };

  // ====== SISTEMA DE INSIGNIAS ======
  let currentEditingBadgeSlot = 0;

  window.openBadgeModal = function (slotIndex) {
    currentEditingBadgeSlot = slotIndex;
    renderBadgeSelection();
    openModal('badge-modal');
  };

  window.renderBadgeSelection = function () {
    const cont = document.getElementById('badge-selection-container');
    cont.innerHTML = '';

    if (player.unlockedBadges.length === 0) {
      cont.innerHTML = '<p style="grid-column: 1/-1; color:#555; text-align:center; font-size:0.8rem; padding:20px;">No has ganado insignias aún guerrero. Sigue entrenando.</p>';
      return;
    }

    BADGE_DB.forEach(badge => {
      if (!player.unlockedBadges.includes(badge.id)) return;
      let isEquipped = player.equippedBadges.includes(badge.id);
      cont.innerHTML += `
      <div onclick="equipBadge('${badge.id}')" style="background:#1a1a1a; border:1px solid ${isEquipped ? 'var(--accent-gold)' : '#333'}; border-radius:8px; padding:10px; text-align:center; cursor:pointer; opacity:${isEquipped ? '0.5' : '1'};">
        <div style="font-size:1.5rem; margin-bottom:5px;">${badge.icon}</div>
        <div style="font-size:0.5rem; color:#888; text-transform:uppercase;">${badge.name}</div>
      </div>
    `;
    });
  };

  window.equipBadge = function (badgeId) {
    // Ver si ya está en otro slot
    let prevIndex = player.equippedBadges.indexOf(badgeId);
    if (prevIndex !== -1) {
      player.equippedBadges[prevIndex] = null;
    }
    player.equippedBadges[currentEditingBadgeSlot] = badgeId;
    savePlayer();
    updateBadgesUI();
    closeModal('badge-modal');
  };

  window.unequipBadgeSlot = function () {
    player.equippedBadges[currentEditingBadgeSlot] = null;
    savePlayer();
    updateBadgesUI();
    closeModal('badge-modal');
  };

  window.updateBadgesUI = function () {
    const slots = document.querySelectorAll('.badge-slot');
    player.equippedBadges.forEach((id, idx) => {
      if (slots[idx]) {
        if (id) {
          let b = BADGE_DB.find(x => x.id === id);
          slots[idx].innerText = b ? b.icon : '';
          slots[idx].style.borderColor = 'var(--accent-gold)';
          slots[idx].style.boxShadow = '0 0 5px var(--accent-gold-glow)';
        } else {
          slots[idx].innerText = '';
          slots[idx].style.borderColor = '#333';
          slots[idx].style.boxShadow = 'none';
        }
      }
    });
  };

  window.checkBadges = function () {
    let newlyUnlocked = false;
    BADGE_DB.forEach(badge => {
      if (!player.unlockedBadges.includes(badge.id)) {
        if (badge.goal(player)) {
          player.unlockedBadges.push(badge.id);
          newlyUnlocked = true;
          showNotification(`¡Logro Desbloqueado: ${badge.name}!`, "Sistema");
        }
      }
    });
    if (newlyUnlocked) savePlayer();
  };
  // ====== FIN SISTEMA INSIGNIAS ======

  // ====== END BAZAR DEL ORÁCULO ======

  // TIMER & AUDIO SYNTH
  let timerInterval;
  let timerSeconds = 0;
  let isCountdown = false;
  let originalTimerSeconds = 0;
  let audioCtx = null;

  function initAudio() {
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        // Función auto-eliminable para desbloquear el AudioContext en Safari/iOS
        const unlock = () => {
          if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume().then(() => {
              console.log("ZenRyu: audioCtx desbloqueado. Estado:", audioCtx.state);
            }).catch(e => console.warn("ZenRyu: resume falló", e));
          }
          if (audioCtx && audioCtx.state === 'running') {
            window.removeEventListener('click', unlock);
            window.removeEventListener('touchstart', unlock);
            window.removeEventListener('touchend', unlock);
            window.removeEventListener('keydown', unlock);
          }
        };
        
        window.addEventListener('click', unlock);
        window.addEventListener('touchstart', unlock);
        window.addEventListener('touchend', unlock);
        window.addEventListener('keydown', unlock);
      }
      
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
    } catch (e) {
      console.warn("ZenRyu: AudioContext initiation blocked or unsupported", e);
    }
  }
  window.initAudio = initAudio;

  function playBeep() {
    initAudio();
    if (!audioCtx) return;
    try {
      let osc = audioCtx.createOscillator();
      let gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
    } catch (e) {
      console.warn("ZenRyu: playBeep failed", e);
    }
  }

  function playGong() {
    initAudio();
    if (!audioCtx) return;
    try {
      let gain = audioCtx.createGain();
      gain.connect(audioCtx.destination);
      gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 3);

      let freqs = [200, 300, 350, 450, 520, 600];
      freqs.forEach(f => {
        let osc = audioCtx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, audioCtx.currentTime);
        osc.detune.setValueAtTime(Math.random() * 20 - 10, audioCtx.currentTime);
        osc.connect(gain);
        osc.start();
        osc.stop(audioCtx.currentTime + 3);
      });
    } catch (e) {
      console.warn("ZenRyu: playGong failed", e);
    }
  }

  function playFanfare() {
    if (!audioCtx) initAudio();
    if (!audioCtx) return;
    let t = audioCtx.currentTime;
    // C, E, G, High C (Arpeggio style)
    let notes = [523.25, 659.25, 783.99, 1046.50, 1046.50];
    notes.forEach((f, i) => {
      let osc = audioCtx.createOscillator();
      let gain = audioCtx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(f, t + i * 0.12);
      gain.gain.setValueAtTime(0, t + i * 0.12);
      gain.gain.linearRampToValueAtTime(0.1, t + i * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.3);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(t + i * 0.12);
      osc.stop(t + i * 0.12 + 0.3);
    });
  }

  function playWhoosh() {
    initAudio();
    if (!audioCtx) return;
    try {
      const osc  = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(500, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      console.warn('ZenRyu: playWhoosh failed', e);
    }
  }

  function throwConfetti() {
    const colors = ['#ffd700', '#28a745', '#ff5555', '#ffffff'];
    // Usamos un DocumentFragment para insertar todos los nodos en UN SOLO reflow
    const frag = document.createDocumentFragment();
    const pieces = [];
    const COUNT = 60;

    for (let i = 0; i < COUNT; i++) {
      let d = document.createElement('div');
      d.style.cssText = [
        'position:fixed',
        'z-index:99999',
        'width:8px',
        'height:16px',
        'will-change:transform',
        'pointer-events:none',
        `background-color:${colors[i % colors.length]}`,
        'top:-20px',
        `left:${Math.random() * 100}vw`,
        `opacity:${Math.random() * 0.5 + 0.5}`,
        `border-radius:${Math.random() > 0.5 ? '50%' : '2px'}`
      ].join(';');
      frag.appendChild(d);
      pieces.push(d);
    }
    // Un único reflow al insertar el Fragment completo
    document.body.appendChild(frag);

    // Animar DESPUÉS de insertar (browser ya tiene los nodos en el árbol)
    pieces.forEach(d => {
      const tx = (Math.random() - 0.5) * 300;
      const ty = window.innerHeight + 100;
      const duration = 2000 + Math.random() * 2500;
      const anim = d.animate([
        { transform: 'translate3d(0,0,0) rotate(0deg)' },
        { transform: `translate3d(${tx}px,${ty}px,0) rotate(${360 + Math.random() * 360}deg)` }
      ], {
        duration,
        easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        fill: 'forwards'
      });
      anim.finished.then(() => d.remove()).catch(() => d.remove());
    });
  }

  window.openTimer = function (seconds) {
    timerSeconds = parseInt(seconds, 10) || 0;
    originalTimerSeconds = timerSeconds;
    isCountdown = timerSeconds > 0;
    updateTimerDisplay();
    openModal('timer-modal');
  }

  document.getElementById('timer-start').addEventListener('click', () => {
    initAudio();
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (isCountdown) {
        timerSeconds--;
        if (timerSeconds <= 5 && timerSeconds > 0) {
          playBeep();
        }
        if (timerSeconds <= 0) {
          clearInterval(timerInterval);
          timerSeconds = 0;
          playGong();
          if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400]);
          showNotification("¡EL TIEMPO SE HA AGOTADO! DESCANSAR.", "Cronos");
        }
      } else {
        timerSeconds++;
      }
      updateTimerDisplay();
    }, 1000);
  });

  document.getElementById('timer-stop').addEventListener('click', () => {
    clearInterval(timerInterval);
    timerSeconds = originalTimerSeconds;
    isCountdown = originalTimerSeconds > 0;
    updateTimerDisplay();
  });
  document.getElementById('timer-close').addEventListener('click', () => {
    clearInterval(timerInterval);
    closeModal('timer-modal');
  });
  function updateTimerDisplay() {
    let m = Math.floor(timerSeconds / 60).toString().padStart(2, '0');
    let s = (timerSeconds % 60).toString().padStart(2, '0');
    document.getElementById('timer-display').innerText = `${m}:${s}`;
  }

  let quoteIdx = Math.floor(Math.random() * zenQuotes.length);
  let quoteEl = document.getElementById('maestro-quote');
  if (quoteEl) {
    quoteEl.innerText = '"' + zenQuotes[quoteIdx] + '"';
    // Rotate quote every 30 seconds
    setInterval(() => {
      quoteIdx = (quoteIdx + 1) % zenQuotes.length;
      quoteEl.style.opacity = '0';
      setTimeout(() => {
        quoteEl.innerText = '"' + zenQuotes[quoteIdx] + '"';
        quoteEl.style.opacity = '1';
      }, 400);
    }, 30000);
  }

  // ====== CÓDIGO SECRETO: MODO MAESTRO ======
  let _secretTaps = 0;
  let _secretTimer = null;
  const heroTitle = document.querySelector('.hero-title');
  if (heroTitle) {
    heroTitle.addEventListener('click', () => {
      _secretTaps++;
      clearTimeout(_secretTimer);
      _secretTimer = setTimeout(() => { _secretTaps = 0; }, 2000);
      if (_secretTaps >= 7) {
        _secretTaps = 0;
        activateCheatMode();
      }
    });
  }

  function activateCheatMode() {
    // Max coins
    player.coins = 99999;
    // Max stats
    ['str', 'spd', 'flex', 'end'].forEach(s => {
      player.stats[s].lvl = 100;
      player.stats[s].xp = 0;
    });
    // Unlock all store items
    STORE_ITEMS.forEach(item => {
      if (!player.unlockedItems.includes(item.id)) {
        player.unlockedItems.push(item.id);
      }
    });
    // Unlock all badges
    BADGE_DB.forEach(badge => {
      if (!player.unlockedBadges.includes(badge.id)) {
        player.unlockedBadges.push(badge.id);
      }
    });
    // High streak & workout count
    player.streak = 100;
    player.workoutCount = 100;
    player.rankIndex = rankTitles.length - 1;

    savePlayer();
    applyInventory();
    updateBadgesUI();
    updateUI();
    if (window.updateCodexUI) updateCodexUI();

    if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 300]);
    showNotification(
      "⚡ MODO MAESTRO ACTIVADO ⚡\n\n🪙 99,999 Monedas Zen\n🗡️ Todos los Stats a Lvl 100\n🔓 Todo el Bazar desbloqueado\n🏅 Todas las insignias obtenidas\n🔥 Racha x100\n\nEl Oráculo te ha concedido el poder absoluto.",
      "🐉 CÓDIGO SECRETO"
    );
  }
  // ====== FIN CÓDIGO SECRETO ======

  // ======================================================================
  //  ZEN RYU SENSEI 6.0 — INTELLIGENT FEATURES
  // ======================================================================

  // --- SETTINGS UI BINDINGS ---


  window.updateGeminiStatusBadge = function (customStatus = null) {
    const badge = document.getElementById('gemini-status-badge');
    if (!badge) return;
    const key = (player.geminiKey || '').trim();

    if (!badge.dataset.wiredClick) {
      badge.dataset.wiredClick = "true";
      badge.style.cursor = "pointer";
      badge.addEventListener('click', () => {
        if (window.lastGeminiError) {
          showNotification(`El oráculo está temporalmente en modo offline por el siguiente motivo:\n\n"${window.lastGeminiError}"\n\nNo te preocupes, el dojo ha activado automáticamente el motor procedimental local sin interrumpir tu forja física.`, "🔮 DIÁLOGO CON EL ORÁCULO");
        } else if (player.geminiKey && player.geminiKey.trim().length > 10) {
          showNotification("El Oráculo AI de Gemini está activo, validado y listo para forjar tus rutinas.", "🔮 DIÁLOGO CON EL ORÁCULO");
        } else {
          showNotification("El Oráculo AI está offline. Introduce tu clave de API en Ajustes para activar entrenamientos dinámicos.", "🔮 DIÁLOGO CON EL ORÁCULO");
        }
      });
    }
    
    if (customStatus) {
      if (customStatus === 'green') {
        badge.textContent = '🟢';
        badge.title = 'Oráculo AI Activo (Haz clic para detalles)';
      } else if (customStatus === 'yellow') {
        badge.textContent = '🟡';
        badge.title = window.lastGeminiError ? `Error: ${window.lastGeminiError} (Haz clic para detalles)` : 'Oráculo AI con problemas de conexión. (Haz clic para detalles)';
      } else if (customStatus === 'loading') {
        badge.textContent = '⏳';
        badge.title = 'Validando clave de API en los servidores del Templo...';
      } else {
        badge.textContent = '🔴';
        badge.title = 'Oráculo Offline (Haz clic para detalles)';
      }
      return;
    }

    if (key && key.length > 10) {
      if (window.lastGeminiError) {
        const errMsg = window.lastGeminiError.toLowerCase();
        if (errMsg.includes('400') || errMsg.includes('403') || errMsg.includes('key') || errMsg.includes('inválid') || errMsg.includes('invalid')) {
          badge.textContent = '🔴';
          badge.title = `Error de Clave: ${window.lastGeminiError} (Haz clic para detalles)`;
        } else {
          badge.textContent = '🟡';
          badge.title = `Error del Oráculo: ${window.lastGeminiError} (Haz clic para detalles)`;
        }
      } else {
        badge.textContent = '🟢';
        badge.title = 'Oráculo AI Activo (Haz clic para detalles)';
      }
    } else {
      badge.textContent = '🔴';
      badge.title = 'Oráculo Offline (Haz clic para detalles)';
    }
  };

  window.saveGeminiKey = async function () {
    const input = document.getElementById('gemini-key');
    if (!input) return;
    const key = input.value.trim();
    
    if (!key) {
      player.geminiKey = '';
      savePlayer();
      window.updateGeminiStatusBadge('red');
      showNotification('Clave eliminada. Operando en modo offline con el motor procedimental.', '🔮 Oráculo AI');
      return;
    }
    
    window.updateGeminiStatusBadge('loading');
    
    try {
      const _vc = new AbortController();
      const _vt = setTimeout(() => _vc.abort(), 10000);
      let resp;
      try {
        resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`, { signal: _vc.signal });
      } finally {
        clearTimeout(_vt);
      }
      if (resp.ok) {
        player.geminiKey = key;
        window.lastGeminiError = '';
        savePlayer();
        window.updateGeminiStatusBadge('green');
        showNotification('Oráculo AI validado y activo. El Maestro Digital guiará tus rutinas desde ahora.', '🔮 Oráculo AI');
      } else {
        let errMessage = `Error HTTP ${resp.status}`;
        try {
          const errData = await resp.json();
          if (errData && errData.error && errData.error.message) {
            errMessage = errData.error.message;
          }
        } catch (_) {}

        window.lastGeminiError = errMessage;
        savePlayer();

        if (resp.status === 400 || resp.status === 403) {
          window.updateGeminiStatusBadge('red');
          showNotification(`Clave de API inválida o inactiva: ${errMessage} (Error ${resp.status}). Por favor, verifícala en Google AI Studio.`, '❌ Error del Oráculo');
        } else {
          player.geminiKey = key;
          window.updateGeminiStatusBadge('yellow');
          showNotification(`Error al verificar la clave: ${errMessage} (Error ${resp.status}). Se guardó de todas formas, pero podría no funcionar.`, '⚠️ Advertencia');
        }
      }
    } catch (err) {
      console.error('Validation error:', err);
      player.geminiKey = key;
      window.lastGeminiError = err.message;
      savePlayer();
      window.updateGeminiStatusBadge('yellow');
      if (err.name === 'AbortError') {
        showNotification('La validación tardó demasiado. La clave se guardó pero no se pudo verificar. Comprueba tu conexión.', '⏱️ Tiempo de Espera Agotado');
      } else {
        showNotification(`No se pudo comprobar la clave con los servidores: ${err.message}. Se guardó de todas formas.`, '📡 Error de Conexión');
      }
    }
  };

  // Wire up gemini key input (save on blur / Enter)
  const _geminiKeyEl = document.getElementById('gemini-key');
  if (_geminiKeyEl) {
    _geminiKeyEl.addEventListener('blur', window.saveGeminiKey);
    _geminiKeyEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); window.saveGeminiKey(); this.blur(); }
    });
  }

  // --- SENSEI VOICE ENGINE (Web Speech & Local Neural TTS) ---

  let _senseiVoice = null;

  function _populateVoiceSelector () {
    if (!window.speechSynthesis) return;
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return;

    const sel = document.getElementById('voice-select');
    if (!sel) return;

    sel.innerHTML = '';

    // Rank voices: Spanish male first, then any Spanish, then all others
    const esMale   = voices.filter(v => 
      v.lang.startsWith('es') && 
      (/jorge|pablo|diego|miguel|antonio|carlos|alvaro|juan|enrique|dario|julio|masculino|male|hombre/i.test(v.name) || 
       /jorge|pablo|diego|miguel|antonio|carlos|alvaro|juan|enrique|dario|julio|masculino|male|hombre/i.test(v.voiceURI))
    );
    const esOther  = voices.filter(v => v.lang.startsWith('es') && !esMale.includes(v));
    const rest     = voices.filter(v => !v.lang.startsWith('es'));
    const ordered  = [...esMale, ...esOther, ...rest];

    ordered.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.voiceURI;
      opt.textContent = `${v.name} (${v.lang})`;
      sel.appendChild(opt);
    });

    // Restore saved choice or auto-select best male Spanish voice
    if (player.savedVoiceURI) {
      sel.value = player.savedVoiceURI;
    } else if (esMale.length > 0) {
      sel.value = esMale[0].voiceURI;
    } else if (esOther.length > 0) {
      sel.value = esOther[0].voiceURI;
    }

    // Sync _senseiVoice to current selection
    _senseiVoice = voices.find(v => v.voiceURI === sel.value) || voices[0] || null;
  }

  function _loadSenseiVoice () {
    if (!window.speechSynthesis) return;
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return;

    _populateVoiceSelector();

    // If no manual choice made yet, auto-select best Spanish male voice
    if (!player.savedVoiceURI) {
      const preferredNames = ['jorge', 'pablo', 'diego', 'miguel', 'antonio', 'carlos', 'alvaro', 'juan', 'enrique', 'dario', 'julio', 'male'];
      _senseiVoice = voices.find(v =>
        v.lang.startsWith('es') && preferredNames.some(n => v.name.toLowerCase().includes(n))
      ) || voices.find(v => v.lang.startsWith('es')) || voices[0] || null;
    }
  }

  if (window.speechSynthesis) {
    _loadSenseiVoice();
    window.speechSynthesis.addEventListener('voiceschanged', _loadSenseiVoice);
  }

  // Wire up voice toggle switch (show/hide selector + persist)
  const _voiceToggleEl = document.getElementById('voice-toggle');
  const _voiceSelectorContainer = document.getElementById('voice-selector-container');

  if (_voiceToggleEl) {
    _voiceToggleEl.addEventListener('change', function () {
      player.voiceEnabled = this.checked;
      savePlayer();
      if (_voiceSelectorContainer) {
        _voiceSelectorContainer.style.display = this.checked ? 'block' : 'none';
      }
      if (player.voiceEnabled) {
        _populateVoiceSelector();
        setTimeout(() => speakSensei('El Sensei Dragón Zen te saluda, guerrero. Tu camino comienza hoy.'), 300);
      } else {
        window.speechSynthesis && window.speechSynthesis.cancel();
      }
    });
    // Restore state on page load
    if (player.voiceEnabled && _voiceSelectorContainer) {
      _voiceSelectorContainer.style.display = 'block';
    }
  }

  // Wire voice selector dropdown change
  const _voiceSelectEl = document.getElementById('voice-select');
  if (_voiceSelectEl) {
    _voiceSelectEl.addEventListener('change', function () {
      const voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
      _senseiVoice = voices.find(v => v.voiceURI === this.value) || _senseiVoice;
      player.savedVoiceURI = this.value;
      savePlayer();
    });
  }

  // Wire voice pitch and rate sliders
  const _pitchSliderEl = document.getElementById('voice-pitch-slider');
  const _pitchValEl = document.getElementById('voice-pitch-val');
  if (_pitchSliderEl) {
    _pitchSliderEl.addEventListener('input', function () {
      player.voicePitch = parseFloat(this.value);
      if (_pitchValEl) _pitchValEl.textContent = player.voicePitch.toFixed(2);
      savePlayer();
    });
  }

  const _rateSliderEl = document.getElementById('voice-rate-slider');
  const _rateValEl = document.getElementById('voice-rate-val');
  if (_rateSliderEl) {
    _rateSliderEl.addEventListener('input', function () {
      player.voiceRate = parseFloat(this.value);
      if (_rateValEl) _rateValEl.textContent = player.voiceRate.toFixed(2);
      savePlayer();
    });
  }

  // Wire test-voice button
  const _testVoiceBtn = document.getElementById('btn-test-voice');
  if (_testVoiceBtn) {
    _testVoiceBtn.addEventListener('click', function () {
      const wasEnabled = player.voiceEnabled;
      player.voiceEnabled = true; // Force speak for test
      speakSensei('La disciplina forja al guerrero. El dolor es pasajero, la gloria es eterna.');
      player.voiceEnabled = wasEnabled;
    });
  }



  function speakSenseiNative (text) {
    if (!window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(text);
      if (_senseiVoice) utt.voice = _senseiVoice;
      utt.lang    = _senseiVoice ? _senseiVoice.lang : 'es-ES';
      utt.rate    = player.voiceRate || 0.95;
      utt.pitch   = player.voicePitch || 1.0;
      utt.volume  = 1.0;
      window.speechSynthesis.speak(utt);
    } catch (e) {
      console.warn('ZenRyu: Native TTS error', e);
    }
  }

  function speakSensei (text) {
    if (!player.voiceEnabled) return;
    speakSenseiNative(text);
  }

  // --- WAKE LOCK API ---

  async function requestWakeLock () {
    if (!('wakeLock' in navigator)) return;
    if (wakeLock) return; // already held
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
      console.log('ZenRyu: Wake Lock acquired ✅');
    } catch (e) {
      console.warn('ZenRyu: Wake Lock request failed', e.message);
    }
  }

  async function releaseWakeLock () {
    if (!wakeLock) return;
    try { await wakeLock.release(); } catch (e) { /* ignore */ }
    wakeLock = null;
    console.log('ZenRyu: Wake Lock released');
  }

  // Re-acquire on tab visibility restore when a session is active
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && window.sessionState && window.sessionState.active) {
      await requestWakeLock();
    }
  });

  // --- FLOATING REST TIMER HUD ---

  function startBreathing() {
    const label = document.getElementById('breath-label');
    if (!label) return;
    const phases = [
      { text: '↑  INHALA', duration: 4000 },
      { text: '◉  RETÉN',  duration: 2000 },
      { text: '↓  EXHALA', duration: 4000 },
      { text: '· · ·',     duration: 2000 }
    ];
    let i = 0;
    function tick() {
      label.textContent = phases[i].text;
      const dur = phases[i].duration;
      i = (i + 1) % phases.length;
      breathPhaseTimer = setTimeout(tick, dur);
    }
    clearTimeout(breathPhaseTimer);
    tick();
  }

  function stopBreathing() {
    clearTimeout(breathPhaseTimer);
    breathPhaseTimer = null;
    const label = document.getElementById('breath-label');
    if (label) label.textContent = '';
  }

  function triggerRestTimer (seconds, isTransition = false) {
    if (!seconds || seconds <= 0) return;
    initAudio();

    const hud     = document.getElementById('rest-timer-hud');
    const display = document.getElementById('rest-timer-seconds');
    const label   = document.getElementById('rest-timer-label');
    if (!hud) return;

    clearInterval(restInterval);
    restSecondsLeft = seconds;
    if (display) display.textContent = restSecondsLeft;
    
    if (label) {
      label.textContent = isTransition ? '⛩️ TRANSICIÓN DE EJERCICIO' : '⏸️ TIEMPO DE RECUPERACIÓN';
    }
    
    // Rellenar dinámicamente la previsualización del siguiente paso
    let nextName = '';
    let nextDetails = '';

    if (currentRoutine && currentRoutine[currentFocusIndex]) {
      const ex = currentRoutine[currentFocusIndex];
      if (isTransition) {
        nextName = ex.n;
        nextDetails = `${ex.sets} SERIES ✕ ${ex.r.toUpperCase()}`;
      } else {
        nextName = ex.n;
        nextDetails = `SERIE ${activeSetIndex + 1} DE ${ex.sets} (✕ ${ex.r.toUpperCase()})`;
      }
    }

    const nextNameEl = document.getElementById('rest-next-name');
    const nextDetailsEl = document.getElementById('rest-next-details');
    const previewContainer = document.getElementById('rest-next-preview');

    if (nextNameEl && nextDetailsEl) {
      nextNameEl.textContent = nextName;
      nextDetailsEl.textContent = nextDetails;
      if (previewContainer) previewContainer.style.display = 'block';
    } else if (previewContainer) {
      previewContainer.style.display = 'none';
    }

    // Seleccionar una cita Zen al azar para inspirar durante el descanso
    const quoteEl = document.getElementById('rest-zen-quote');
    if (quoteEl && typeof zenQuotes !== 'undefined' && zenQuotes.length > 0) {
      const randomQuote = zenQuotes[Math.floor(Math.random() * zenQuotes.length)];
      quoteEl.textContent = `"${randomQuote}"`;
    }
    
    // Mostrar como flex (pantalla completa)
    hud.style.display = 'flex';
    startBreathing();

    if (isTransition) {
      speakSensei(`Técnica forjada. Transición al siguiente ejercicio. Descansa ${seconds} segundos.`);
    } else {
      speakSensei(`Descansa ${seconds} segundos. Respira y recarga.`);
    }

    restInterval = setInterval(() => {
      restSecondsLeft--;
      if (display) display.textContent = restSecondsLeft;

      if (restSecondsLeft > 0 && restSecondsLeft <= 3) playBeep();

      if (restSecondsLeft <= 0) {
        clearInterval(restInterval);
        restInterval = null;
        stopBreathing();
        hud.style.display = 'none';
        playGong();
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        speakSensei('¡Tiempo! Vuelve a la posición. Activa el cuerpo.');
      }
    }, 1000);
  }

  window.adjustRestTimer = function (amount) {
    if (restInterval === null) return; // timer not running
    restSecondsLeft = Math.max(0, restSecondsLeft + amount);
    const display = document.getElementById('rest-timer-seconds');
    if (display) display.textContent = restSecondsLeft;
    if (restSecondsLeft <= 0) window.skipRestTimer();
  };

  window.skipRestTimer = function () {
    clearInterval(restInterval);
    restInterval = null;
    restSecondsLeft = 0;
    stopBreathing();
    const hud = document.getElementById('rest-timer-hud');
    if (hud) hud.style.display = 'none';
    playBeep();
    speakSensei('Omitiendo descanso. Mantén la técnica.');
  };

  window.saveWorkoutFeedback = function () {
    const input = document.getElementById('feedback-input');
    if (!input) return;
    const val = input.value.trim();
    if (!val) return;
    player.lastWorkoutFeedback = val;
    savePlayer();
    const btn = input.nextElementSibling;
    if (btn) {
      btn.textContent = '✅ GUARDADO — IA ADAPTARÁ TU PRÓXIMA RUTINA';
      btn.style.color = 'var(--accent-green)';
      btn.style.borderColor = 'rgba(40,167,69,0.4)';
    }
    input.style.borderColor = 'rgba(40,167,69,0.4)';
  };

  // --- HEATMAP RENDERER (Year-Long Consistency Calendar) ---

  window.renderHeatmap = async function () {
    const grid = document.getElementById('heatmap-grid');
    if (!grid) return;

    // Load IndexedDB history
    let history = [];
    try { history = await zendb.getAllHistory(); } catch (e) { /* offline */ }

    // Build date → count map
    const dateMap = {};
    history.forEach(entry => {
      if (!entry || !entry.date) return;
      try {
        const d = new Date(entry.date);
        if (isNaN(d.getTime())) return;
        const key = d.toISOString().split('T')[0];
        dateMap[key] = (dateMap[key] || 0) + 1;
      } catch (e) { /* skip bad entries */ }
    });

    // Build 365-day array (oldest first → grid flows left to right)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let html = '';

    for (let i = 364; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const count = dateMap[key] || 0;
      const level = count === 0 ? 0 : count === 1 ? 1 : count === 2 ? 2 : count === 3 ? 3 : 4;
      const label = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
      const title = count === 0
        ? `${label}: Sin entrenamiento`
        : `${label}: ${count} sesión${count !== 1 ? 'es' : ''}`;
      html += `<div class="heatmap-cell level-${level}" title="${title}"></div>`;
    }

    grid.innerHTML = html;

    // Update stats label if present
    const totalDays   = Object.keys(dateMap).length;
    const totalSess   = Object.values(dateMap).reduce((a, b) => a + b, 0);
    const statsLabel  = document.getElementById('heatmap-stats');
    if (statsLabel) {
      statsLabel.textContent = `${totalDays} días activos · ${totalSess} sesiones totales en el último año`;
    }
  };

  // --- GEMINI AI ROUTINE GENERATOR ---

  async function generateGeminiRoutine (type, focusStat = null) {
    document.getElementById('loader').style.display = 'block';
    window.currentAiMessage = null;

    try {
      const key = (player.geminiKey || '').trim();
      if (!key) throw new Error('No API key');

      // Filter exercises by user equipment, injuries, and strict player level checks
      const userEquip    = player.equipment || 'none';
      const userInjuries = player.injuries  || [];

      const availEx = EXERCISE_DB.filter(ex => {
        const equipOk = userEquip === 'none' ? ex.equip === 'none'
          : userEquip === 'bar' ? (ex.equip === 'none' || ex.equip === 'bar')
          : true;
        const injuryOk = userInjuries.length === 0
          ? true
          : !ex.avoidInjuries.some(i => userInjuries.includes(i));
        const domainOk = type === 'mobility' ? ex.domain === 'mobility' : ex.domain === 'conditioning';
        
        // Strict level matching: User must have unlocked the exercise's minimum level
        const userLvl = player.stats[ex.s]?.lvl || 1;
        const lvlOk   = userLvl >= ex.lvl_min;

        return equipOk && injuryOk && domainOk && lvlOk;
      });

      // Compact exercise list for prompt (reduces token count)
      const exList = availEx.map(ex =>
        `${ex.id}|${ex.real}|${ex.s}|Lv${ex.lvl_min}-${ex.lvl_max}`
      ).join('\n');

      const checkin     = window.dailyCheckin || { energy: 3, soreness: 'no', notes: '' };
      const rankTitle   = getCurrentRank().title;
      const isMobility  = type === 'mobility';
      const targetCount = isMobility ? 6 : (player.rankIndex < 4 ? 6 : 8);
      const minCount    = Math.max(4, targetCount - 2);

      let scrollRule = "";
      if (player.equippedRelic === 'relic_scroll') {
        scrollRule = "\n- REGLA DEL PERGAMINO ACTIVA: Incrementa en 1 serie (set) cada ejercicio de la rutina (ej: si estimabas 3 sets, prescribe 4).";
      }

      const prompt = `Eres el Sensei Dragón Zen, maestro supremo de la calistenia marcial. Diseña una rutina personalizada AHORA.

PERFIL DEL GUERRERO:
- Nombre: ${player.name} | Rango: ${rankTitle}
- Fuerza Lvl ${player.stats.str.lvl} | Velocidad Lvl ${player.stats.spd.lvl} | Flex Lvl ${player.stats.flex.lvl} | Resistencia Lvl ${player.stats.end.lvl}
- Equipamiento: ${userEquip === 'none' ? 'Solo suelo' : userEquip === 'bar' ? 'Suelo + Barra' : 'Dojo Completo'}
- Lesiones activas: ${userInjuries.length > 0 ? userInjuries.join(', ') : 'Ninguna'}

ESTADO FÍSICO HOY:
- Energía: ${checkin.energy}/5 | Agujetas: ${checkin.soreness === 'si' ? 'SÍ' : 'NO'}
- Notas: "${checkin.notes || 'Sin notas'}"
- Feedback anterior: "${player.lastWorkoutFeedback || 'Sin registro previo'}"  
- Sesión: ${isMobility ? 'MOVILIDAD' : focusStat ? `ESPECIALIZACIÓN ${focusStat.toUpperCase()}` : 'ACONDICIONAMIENTO'}

EJERCICIOS DISPONIBLES (id|nombre|stat|nivel):
${exList}

REGLAS:
- Usa solo IDs de la lista de arriba.
- Elige entre ${minCount} y ${targetCount} ejercicios apropiados para el nivel del guerrero.
- Si energía ≤ 2, reduce a ${minCount} ejercicios de menor intensidad.
- Si hay agujetas, evita grupos musculares fatigados.
- Para cada ejercicio indica: id (de la lista), sets (2-4), customVal (reps/segs reales según su nivel).${scrollRule}
- El campo "insight" es un mantra filosófico inspirador de máximo 2 frases.

RESPONDE ÚNICAMENTE con este JSON válido (sin texto adicional):
{
  "insight": "Frase filosófica del Sensei.",
  "routine": [
    { "id": "str_2", "sets": 3, "customVal": 12 }
  ]
}`;

      // 30-second timeout to prevent infinite loader spin
      const _ctrl = new AbortController();
      const _timeoutId = setTimeout(() => _ctrl.abort(), 30000);

      let apiResp;
      try {
        apiResp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${key}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: _ctrl.signal,
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.75,
                maxOutputTokens: 1024
              }
            })
          }
        );
      } finally {
        clearTimeout(_timeoutId);
      }

      if (!apiResp.ok) {
        let errDetails = `API HTTP ${apiResp.status}`;
        try {
          const errData = await apiResp.json();
          if (errData && errData.error && errData.error.message) {
            errDetails = `${errData.error.message} (HTTP ${apiResp.status})`;
          }
        } catch (_) {}
        throw new Error(errDetails);
      }

      const apiData  = await apiResp.json();
      const rawText  = apiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Parse response — strip markdown fences if present (gemini-2.0-flash-lite may wrap JSON)
      let parsed;
      try {
        parsed = JSON.parse(rawText);
      } catch (_) {
        // Strip ```json ... ``` or ``` ... ``` wrappers
        const stripped = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
        try {
          parsed = JSON.parse(stripped);
        } catch (_2) {
          const match = stripped.match(/\{[\s\S]*\}/);
          if (match) parsed = JSON.parse(match[0]);
          else throw new Error('No JSON encontrado en respuesta de Gemini');
        }
      }

      window.currentAiMessage = parsed.insight || '';

      // Map Gemini IDs back to full exercise objects with proper scaling
      const routine = [];
      for (const item of (parsed.routine || [])) {
        const exBase = EXERCISE_DB.find(x => x.id === item.id);
        if (!exBase) continue;

        const pLvl     = player.stats[exBase.s]?.lvl || 1;
        const capLevel = Math.min(pLvl, exBase.lvl_max + 5);
        const factor   = (capLevel - exBase.lvl_min) * exBase.scale;
        const autoVal  = Math.floor(Math.max(exBase.baseVal, exBase.baseVal + factor));
        const finalVal = (item.customVal && item.customVal > 0) ? item.customVal : autoVal;
        let numSets  = Math.min(Math.max(item.sets || 3, 2), 5);
        if (player.equippedRelic === 'relic_scroll') {
          numSets = Math.min(5, numSets + 1);
        }

        routine.push({
          id:      exBase.id,
          n:       `${exBase.n} (${exBase.real})`,
          r:       `${finalVal} ${exBase.t === 'time' ? 'segs' : 'reps'}`,
          t:       exBase.t,
          val:     finalVal,
          s:       exBase.s,
          domain:  exBase.domain,
          sets:    numSets,
          desc:    exBase.desc,
          m:       exBase.m,
          alt:     exBase.alt,
          lvl_min: exBase.lvl_min
        });
      }

      if (routine.length === 0) throw new Error('Rutina vacía de Gemini');

      currentRoutine = routine;
      document.getElementById('loader').style.display = 'none';
      renderOverview(routine);

      // Sensei speaks the AI insight
      setTimeout(() => {
        speakSensei(parsed.insight || 'El Oráculo ha forjado tu camino de hoy, guerrero.');
      }, 600);

      // Mark badge as active
      window.lastGeminiError = '';
      window.updateGeminiStatusBadge('green');

    } catch (err) {
      console.error('ZenRyu: Gemini error → fallback offline', err.name, err.message);
      window.currentAiMessage = null;
      window.lastGeminiError = err.name === 'AbortError'
        ? 'Tiempo de espera agotado (30s). El Oráculo tardó demasiado.'
        : (err.message || 'Error desconocido');
      window.updateGeminiStatusBadge('yellow');

      generateOfflineRoutine(type, focusStat);
    }
  }

  // ====== END 6.0 INTELLIGENT FEATURES ======

  // Hook openModal to refresh Gemini status badge and voice dropdown dynamically when Settings is opened
  window.addEventListener('load', () => {
    const originalOpenModal = window.openModal;
    window.openModal = function (id) {
      if (id === 'settings-modal') {
        _populateVoiceSelector();
        if (window.updateGeminiStatusBadge) window.updateGeminiStatusBadge();
      }
      if (originalOpenModal) {
        originalOpenModal(id);
      }
    };
  });

  loadPlayer();
})();


window.UISoundEngine = {
  ctx: null,
  init: function () {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },
  playClick: function () {
    this.init();
    if (!this.ctx) return;
    let t = this.ctx.currentTime;
    let osc = this.ctx.createOscillator();
    let gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.exponentialRampToValueAtTime(100, t + 0.05);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.02, t + 0.01);
    gain.gain.linearRampToValueAtTime(0.001, t + 0.05);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.06);
  },
  playSwoosh: function () {
    this.init();
    if (!this.ctx) return;
    let t = this.ctx.currentTime;
    let osc = this.ctx.createOscillator();
    let gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.15);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.05, t + 0.05);
    gain.gain.linearRampToValueAtTime(0.001, t + 0.2);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.25);
  },
  playError: function () {
    this.init();
    if (!this.ctx) return;
    let t = this.ctx.currentTime;
    let osc = this.ctx.createOscillator();
    let gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.linearRampToValueAtTime(100, t + 0.15);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.05, t + 0.02);
    gain.gain.linearRampToValueAtTime(0.001, t + 0.2);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.25);
  }
};

document.addEventListener('click', (e) => {
  if (window.UISoundEngine) window.UISoundEngine.init();
  if (window.initAudio) window.initAudio();
  let target = e.target.closest('button, .nav-item, .exercise-card, .btn-primary, .btn-secondary, .btn-complete-massive, .radio-btn, .zoomable-image, .mission-card');
  if (target) {
    if (target.disabled) {
      if (window.UISoundEngine) window.UISoundEngine.playError();
      if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
    } else {
      if (window.UISoundEngine) window.UISoundEngine.playClick();
      if (navigator.vibrate) navigator.vibrate(15);
    }
  }
});
