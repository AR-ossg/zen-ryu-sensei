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
    unlockedBadges: [],
    equippedBadges: [null, null, null]
  };

  const BADGE_DB = [
    { id: 'b_streak_3', name: 'Llama Naciente', icon: '🔥', desc: 'Alcanza una racha de 3 días.', goal: (p) => p.streak >= 3 },
    { id: 'b_streak_7', name: 'Llama Eterna', icon: '🏮', desc: 'Alcanza una racha de 7 días.', goal: (p) => p.streak >= 7 },
    { id: 'b_lvl_5', name: 'Iniciado ZEN', icon: '🥋', desc: 'Alcanza el nivel 5 de fuerza/res.', goal: (p) => p.stats.str.lvl >= 5 || p.stats.end.lvl >= 5 },
    { id: 'b_lvl_10', name: 'Guerrero de Élite', icon: '🗡️', desc: 'Alcanza el nivel 10 en cualquier estadística.', goal: (p) => Object.values(p.stats).some(s => s.lvl >= 10) },
    { id: 'b_rich', name: 'Bolsillos de Oro', icon: '💰', desc: 'Acumula 1000 Monedas Zen.', goal: (p) => p.coins >= 1000 },
    { id: 'b_library', name: 'Científico del Dojo', icon: '🧠', desc: 'Realiza 10 entrenamientos totales.', goal: (p) => p.workoutCount >= 10 }
  ];

  const STORE_ITEMS = [
    { id: 'aura_zafiro', type: 'aura', name: 'Aura Zafiro', desc: 'Remplaza el dorado del Dojo con un frío resplandor azul.', price: 500, icon: '🔵', meta: '#00ccff' },
    { id: 'aura_abismal', type: 'aura', name: 'Aura Abismal', desc: 'Sume el Dojo en una atmósfera de veneno oscuro.', price: 500, icon: '🟣', meta: '#aa00ff' },
    { id: 'mus_taiko', type: 'music', name: 'Sinfonía Taiko', desc: 'Desbloquea tambores de guerra en la Emisora Astral.', price: 150, icon: '🥁', meta: 'audio-taiko' },
    { id: 'mus_synth', type: 'music', name: 'Cyber-Dojo Beat', desc: 'Desbloquea pulsos synthwave en la Emisora.', price: 150, icon: '🎹', meta: 'audio-synth' },
    { id: 'lore_v1', type: 'lore', name: 'Tomo I: La Caída', desc: 'Lee el primer fragmento del Maestro Dragón ZEN.', price: 200, icon: '📜', meta: 'La historia comienza cuando mi cuerpo dejó de doler y empezó a arder. No hablo de un ardor poético, hablo del ácido láctico devorando los filamentos de mi músculo hasta la parálisis. Me llamaban prodigio, pero el prodigio es solo una excusa de los mediocres para no entrenar hasta sangrar. El templo original no cayó por un asedio, cayó porque nadie más pudo mantener el ritmo. Cuando logres mil flexiones al alba, entenderás por qué.' },
    { id: 'lore_v2', type: 'lore', name: 'Tomo II: El Arte Vacío', desc: 'Secretos prohibidos de la respiración en letargo.', price: 400, icon: '📜', meta: 'Cuando el pulmón colapsa, la mente intenta sobrevivir. La "Respiración Vacía", el secreto peor guardado del linaje, no consiste en inhalar más aire, sino en aceptar la falta de él. Cuando cuelgas de una barra, tu corazón late a 180 pulsaciones. Es ahí donde encuentras el silencio. Si tu espíritu flaquea antes que tu agarre, ya estabas muerto antes de empezar.' },
    { id: 'relic_oni', type: 'relic', name: 'Máscara Oni Destrozada', desc: 'Reliquia coleccionable de altísimo prestigio.', price: 1000, icon: '👹', meta: '' },
    { id: 'relic_blade', type: 'relic', name: 'Hoja Ancestral Oxidada', desc: 'Un testigo silencioso de innumerables batallas y sudor.', price: 1000, icon: '🗡️', meta: '' }
  ];

  let workoutHistory = [];

  const STAT_LABELS = {
    str: 'FUERZA',
    spd: 'VELOCIDAD',
    flex: 'FLEXIBILIDAD',
    end: 'RESISTENCIA'
  };

  window.debugSystem = function () {
    if (confirm("El sistema buscará la versión más reciente del Códice y reiniciará la app para aplicarla. Tu progreso no sufrirá cambios. ¿Proceder?")) {
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
          alert("Perfil restituido de forma segura. La academia se reiniciará para cargar tus habilidades.");
          location.reload();
        } else { alert("Archivo no válido para Zen Ryu Sensei."); }
      } catch (err) { alert("Error leyendo el archivo."); }
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
        if (!player.stats.str.lvl) {
          player.stats = { str: { lvl: 1, xp: 0 }, spd: { lvl: 1, xp: 0 }, flex: { lvl: 1, xp: 0 }, end: { lvl: 1, xp: 0 } };
        }
      }
      if (typeof player.workoutCount === 'undefined') player.workoutCount = 0;
      if (typeof player.coins === 'undefined') player.coins = 0;
      if (typeof player.streak === 'undefined') player.streak = 0;
      if (typeof player.lastWorkoutDate === 'undefined') player.lastWorkoutDate = null;
      if (!player.unlockedItems) player.unlockedItems = [];
      if (!player.activeAura) player.activeAura = null;
      if (!player.unlockedBadges) player.unlockedBadges = [];
      if (!player.equippedBadges) player.equippedBadges = [null, null, null];

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
    const snd = document.getElementById('sys-sync-sound');
    if (snd) {
      snd.currentTime = 0;
      snd.play().catch(() => { });
    }
  };

  window.playCompleteSound = function () {
    const snd = document.getElementById('sys-complete-sound');
    if (snd) {
      snd.currentTime = 0;
      snd.play().catch(() => { });
    }
  };

  // ONBOARDING WIZARD
  window.nextWizardStep = function (currentStep) {
    console.log(`ZenRyu: nextWizardStep ${currentStep}`);
    let inputsCheck = {
      1: 'ob-name',
      2: 'ob-str',
      3: 'ob-spd',
      4: 'ob-flex'
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
    let endVal = document.getElementById('ob-end').value;
    if (endVal.trim() === '') {
      showNotification("No escapes del ejercicio final.", "Aviso");
      return;
    }

    player.name = document.getElementById('ob-name').value;
    let vStr = parseInt(document.getElementById('ob-str').value) || 0;
    let vSpd = parseInt(document.getElementById('ob-spd').value) || 0;
    let vFlex = parseInt(document.getElementById('ob-flex').value) || 1;
    let vEnd = parseFloat(document.getElementById('ob-end').value) || 0;

    let lvlStr = Math.max(1, Math.floor(vStr / 2) + 1);
    let lvlSpd = Math.max(1, Math.floor(vSpd * 0.8) + 1);
    let lvlFlex = Math.max(1, vFlex);
    let lvlEnd = Math.max(1, Math.floor(vEnd * 3.5) + 1);

    let maxInitLvl = Math.max(lvlStr, lvlSpd, lvlFlex, lvlEnd);
    let startIdx = rankTitles.findIndex(r => maxInitLvl <= r.max);
    player.rankIndex = startIdx === -1 ? rankTitles.length - 1 : startIdx;

    let allowedCap = rankTitles[player.rankIndex].max;
    player.stats = {
      str: { lvl: Math.min(lvlStr, allowedCap), xp: 0 },
      spd: { lvl: Math.min(lvlSpd, allowedCap), xp: 0 },
      flex: { lvl: Math.min(lvlFlex, allowedCap), xp: 0 },
      end: { lvl: Math.min(lvlEnd, allowedCap), xp: 0 }
    };

    player.workoutCount = 0;

    savePlayer();
    document.getElementById('onboarding-wizard').classList.add('hide');
    updateUI();
    // Pequeña pausa para que el wizard desaparezca antes de mostrar la tarjeta
    setTimeout(() => {
      showAscensionCard(getCurrentRank());
    }, 350);
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

  function buildCodexRankHtml() {
    let html = '';
    rankTitles.forEach((r, idx) => {
      const isAcquired = player.rankIndex >= idx;
      const isCurrent = player.rankIndex === idx;
      const color = r.color || '#FFD700';
      if (isAcquired) {
        html += '<div style="background:#111; border:1px solid ' + (isCurrent ? color : 'rgba(255,255,255,0.08)') + '; border-radius:14px; padding:18px; margin-bottom:14px; box-shadow:' + (isCurrent ? '0 0 20px ' + color + '33' : 'none') + '; position:relative;">';
        if (isCurrent) html += '<div style="position:absolute;top:12px;right:12px;background:' + color + ';color:#000;font-size:0.5rem;font-weight:900;padding:3px 8px;border-radius:4px;letter-spacing:1.5px;">ACTUAL</div>';
        html += '<div style="display:flex;align-items:center;gap:14px;margin-bottom:12px;">';
        html += '<span style="font-size:2.8rem;text-shadow:0 0 12px ' + color + ';">' + r.icon + '</span>';
        html += '<div><div style="font-family:\'Cinzel\';font-size:1rem;color:' + (isCurrent ? color : '#fff') + ';font-weight:700;margin-bottom:2px;">' + r.title + '</div>';
        html += '<div style="font-size:0.6rem;color:#555;letter-spacing:1px;text-transform:uppercase;">Límite Nivel ' + (r.max === 999 ? 'Máximo' : r.max) + '</div></div></div>';
        html += '<p style="font-style:italic;color:' + color + ';font-size:0.8rem;line-height:1.5;padding:10px 12px;border-left:2px solid ' + color + ';margin-bottom:10px;background:' + color + '11;border-radius:0 6px 6px 0;">' + (r.wisdom || '') + '</p>';
        html += '<p style="color:#aaa;font-size:0.8rem;line-height:1.6;margin:0;">' + (r.lore || '') + '</p>';
        html += '</div>';
      } else {
        html += '<div style="background:#0a0a0a;border:1px dashed #1a1a1a;border-radius:14px;padding:16px;margin-bottom:14px;opacity:0.45;">';
        html += '<div style="display:flex;align-items:center;gap:14px;">';
        html += '<span style="font-size:2.8rem;filter:grayscale(1) brightness(0.25);">' + r.icon + '</span>';
        html += '<div><div style="font-family:\'Cinzel\';font-size:0.95rem;color:#333;font-weight:700;">??? RANGO SELLADO</div>';
        html += '<div style="font-size:0.65rem;color:#2a2a2a;letter-spacing:1px;margin-top:3px;">Supera el Examen Marcial para revelar este conocimiento</div></div></div></div>';
      }
    });
    return html;
  }

  window.openInfoModal = function (name, desc, imgUrl) {
    document.getElementById('info-title').innerText = name;

    let items = desc.split(/\d+\.\s*/).filter(i => i.trim() !== '');
    let listHtml = '';
    if (items.length > 1) {
      listHtml = '<ol style="padding-left: 20px; font-family: \'Inter\', sans-serif;">';
      items.forEach(item => {
        listHtml += `<li style="margin-bottom: 12px; color: #ccc;">${item.trim()}</li>`;
      });
      listHtml += '</ol>';
    } else {
      listHtml = `<p style="line-height:1.5; color:#ccc;">${desc}</p>`;
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

  window.updateCodexUI = function () {
    const listEl = document.getElementById('codex-list');
    if (!listEl) return;
    listEl.innerHTML = buildCodexRankHtml();
    document.getElementById('codex-sessions').innerText = player.workoutCount;
    let hxHtml = workoutHistory.map(h => {
      const dateStr = h.date || '';
      const typeStr = h.type || (h.routine ? 'Entrenamiento' : 'Sesión');
      return '<div style="margin-bottom:8px; border-left:2px solid var(--accent-gold); padding-left:8px;"><span style="color:var(--text-dim);">' + dateStr + '</span><br><span style="color:#fff;">' + typeStr + '</span></div>';
    }).join('');
    if (workoutHistory.length === 0) hxHtml = "<span style='color:#666; font-style:italic;'>Aún no hay gestas registradas.</span>";
    let hxContainer = document.getElementById('codex-history');
    if (hxContainer) hxContainer.innerHTML = hxHtml;
  };

  window.openCodexModal = function () {
    openModal('codex-modal');
  };


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
      let selected = [];
      const statsOrder = ['str', 'spd', 'end', 'flex'];

      // El volumen es ahora estático por petición del guerrero:
      // Cuerpo Completo = 8 ejercicios (2 de cada uno)
      // Especializado = 6 ejercicios (del mismo stat)
      let targetStats = focusStat ? [focusStat] : statsOrder;
      let countPerStat = focusStat ? 6 : 2;

      targetStats.forEach(stat => {
        // 1. Filtrar base de datos según nivel individual y stat
        let validForStat = EXERCISE_DB.filter(ex => {
          let pLvl = player.stats[stat]?.lvl || 1;
          let topLimit = window.isExamRoutine ? ex.lvl_max + 10 : ex.lvl_max;
          return ex.s === stat && pLvl >= ex.lvl_min && pLvl <= topLimit;
        });

        if (validForStat.length === 0) {
          validForStat = EXERCISE_DB.filter(ex => ex.s === stat);
        }

        // 2. Barajar pool de este stat y seleccionar
        let pool = [...validForStat].sort(() => 0.5 - Math.random());
        let statSelection = [];
        while (statSelection.length < countPerStat) {
          statSelection.push(...pool);
        }
        selected.push(...statSelection.slice(0, countPerStat));
      });

      // 3. Escalar matemáticamente (sin barajar al final para mantener orden)
      let routine = selected.map(ex => {
        let isExam = window.isExamRoutine;
        let pLvl = player.stats[ex.s]?.lvl || 1;
        let virtualLevel = isExam ? ex.lvl_max : pLvl;

        let factor = (virtualLevel - ex.lvl_min) * ex.scale;
        let finalVal = Math.floor(Math.max(ex.baseVal, ex.baseVal + factor));
        let numSets = type === 'mobility' ? 2 : (player.rankIndex >= 2 ? 4 : 3);
        if (isExam) numSets += 1;

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

    }, 150);
  }

  const startRoutineHandler = (type = 'conditioning', focusStat = null) => {
    let examPending = checkExamPending();
    if (examPending && type === 'conditioning') {
      showNotification("El Oráculo observa tu espíritu. Estás a punto de iniciar una Prueba de Ascenso. Sé absolutamente sincero: marca como terminada una serie SÓLO si realmente lograste el esfuerzo estricto y la técnica correcta. Engañar al sistema hoy significa lesionarte mañana en niveles superiores. El honor no admite auto-trampas.", "Examen Marcial de Honor", () => {
        window.isExamRoutine = true;
        initRoutineGeneration(type, focusStat);
      });
      return;
    } else if (examPending && type === 'mobility') {
      showNotification("Debes probar tu valía física en el Examen de Ascenso antes de recuperar el aliento en la movilidad.", "Disciplina");
      return;
    }

    window.isExamRoutine = false;
    window.currentFocusStat = focusStat; // Guardar el foco para la sesión actual
    initRoutineGeneration(type, focusStat);
  };

  function initRoutineGeneration(type, focusStat = null) {
    switchView('routine-overview-view', 'home-view');
    document.getElementById('overview-content').style.display = 'none';
    generateOfflineRoutine(type, focusStat);
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
    generateOfflineRoutine(currentType, currentFocus);
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
      const safeN = (ex.n || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
      const safeDesc = (ex.desc || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
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

    ovList.innerHTML = html;
    document.getElementById('overview-content').style.display = 'block';
  }

  let currentFocusIndex = 0;

  function renderFocusExercises(exercises) {
    const container = document.getElementById('focus-exercises-container');
    document.getElementById('focus-finish-container').style.display = 'none';
    currentFocusIndex = 0;

    let fullHtml = '';
    exercises.forEach((ex, index) => {
      const isTime = ex.t === 'time' || ex.t === 'tiempo';
      const numericVal = parseInt(ex.val) || 0;

      let timerBtn = '';
      if (isTime && numericVal > 0) {
        timerBtn = `<div style="display:flex; gap:8px;">
            <button class="btn-secondary" style="border-color:var(--accent-gold); color:var(--accent-gold); width:50%;" onclick="openTimer(${numericVal})">⏱️ ESFUERZO</button>
            <button class="btn-secondary" style="border-color:#555; width:50%;" onclick="openTimer(60)">⏱️ RECUPERACIÓN</button>
         </div>`;
      } else {
        timerBtn = `<button class="btn-secondary" style="width:100%; border-color:#555;" onclick="openTimer(60)">⏱️ RECUPERACIÓN 60s</button>`;
      }

      const safeImg = ex.m && (ex.m.startsWith('http') || ex.m.startsWith('./')) ? ex.m : '';
      const safeDesc = (ex.desc || '').replace(/'/g, "\\\\'").replace(/"/g, '&quot;');
      const safeN = (ex.n || '').replace(/'/g, "\\\\'").replace(/"/g, '&quot;');
      const altBtn = (ex.alt && !window.isExamRoutine)
        ? `<button class="btn-secondary" style="border-color:var(--accent-red); color:#ff5555; width:100%; margin-top:8px; font-weight:700;" onclick="mutateExercise(${index}, '${ex.id}')">🔄 ADAPTAR TÉCNICA</button>`
        : '';

      const baseLvl = ex.lvl_min || 1;
      const baseXP = Math.round(Math.max(20, baseLvl * 1.5 + ex.sets * 2));
      const xpReward = window.isExamRoutine ? Math.round(baseXP * 1.5) : baseXP;

      fullHtml += `
        <div class="exercise-card focus-card" id="ex-${index}" style="position:absolute; width:100%; height:100%; left:0; top:0; background:none; border:none; box-shadow:none; padding:10px; opacity: ${index === 0 ? 1 : 0}; pointer-events: ${index === 0 ? 'all' : 'none'}; transform: ${index === 0 ? 'translateX(0)' : 'translateX(50px)'}; transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.4s ease; display:flex; flex-direction:column; align-items:center; text-align:center; box-sizing:border-box; justify-content:center;">

          <div style="font-size:1.5rem; color:var(--accent-gold); font-family:'Cinzel'; margin-bottom:5px; text-shadow:0 0 10px rgba(255,215,0,0.3);">${ex.n}</div>
          <div style="background:#111; color:var(--accent-gold); padding:4px 10px; border-radius:4px; font-size:0.75rem; font-family:'Inter'; letter-spacing:1px; margin-bottom:15px; border:1px solid #333;">${STAT_LABELS[ex.s || 'str']}</div>
          
          <div style="font-size:1.3rem; margin-bottom:20px; color:#fff; font-weight:900; letter-spacing:1px; background:#1a1a1a; padding:10px 20px; border-radius:8px; border:1px dashed #444; width:100%;">
            ${ex.sets} SERIES ✕ ${ex.r.toUpperCase()}
          </div>
          
          <div style="display:flex; flex-direction:column; gap:8px; width:100%; max-width:350px;">
            <button class="btn-complete-massive focus-complete-btn" onclick="completeFocusTask(${index}, '${ex.s || 'str'}', ${xpReward})">✔️ FORJAR (+${xpReward} XP)</button>
            ${timerBtn}
            <button class="btn-secondary" style="width:100%; border-color:#444;" onclick="openInfoModal('${safeN}', '${safeDesc}', '${safeImg}')">👁️ TÉCNICA E INSTRUCCIONES</button>
            ${altBtn}
          </div>
        </div>`;
    });

    container.innerHTML = fullHtml;
    updateFocusProgress();
  }

  function updateFocusProgress() {
    let el = document.getElementById('focus-progress-text');
    if (el) el.innerText = `EJERCICIO ${currentFocusIndex + 1} DE ${currentRoutine.length}`;
  }

  window.completeFocusTask = function (index, statAlias, xpReward) {
    if (navigator.vibrate) navigator.vibrate(50);
    let s = "str";
    if (statAlias.toLowerCase().includes("spd")) s = "spd";
    if (statAlias.toLowerCase().includes("flex")) s = "flex";
    if (statAlias.toLowerCase().includes("end")) s = "end";

    const xp = (typeof xpReward === 'number' && xpReward > 0) ? xpReward : 20;
    gainXP(xp, s);

    if (!window.sessionState || !window.sessionState.active) {
      showNotification(`Tu disciplina ha forjado +${xp} XP en ${STAT_LABELS[s]}.\n\nEl dolor es debilidad abandonando el cuerpo.`, "🥊 Esfuerzo Honrado");
    }

    let currentCard = document.getElementById(`ex-${index}`);
    if (currentCard) {
      currentCard.style.opacity = '0';
      currentCard.style.transform = 'translateX(-50px)';
      currentCard.style.pointerEvents = 'none';
    }

    currentFocusIndex++;

    if (currentFocusIndex < currentRoutine.length) {
      let nextCard = document.getElementById(`ex-${currentFocusIndex}`);
      if (nextCard) {
        nextCard.style.opacity = '1';
        nextCard.style.transform = 'translateX(0)';
        nextCard.style.pointerEvents = 'all';
      }
      updateFocusProgress();
    } else {
      document.getElementById('focus-progress-text').innerText = "RUTINA COMPLETADA";
      document.getElementById('btn-cancel-focus').style.display = 'none';

      // Recompensas
      const today = new Date();
      const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      let earnedCoins = 50;

      if (player.lastWorkoutDate) {
        const lastDate = new Date(player.lastWorkoutDate);
        const lastWorkout = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());
        const diffTime = todayDate - lastWorkout;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) { player.streak = (player.streak || 0) + 1; }
        else if (diffDays > 1) { player.streak = 1; }
      } else {
        player.streak = 1;
      }
      player.lastWorkoutDate = today.toISOString();
      player.coins = (player.coins || 0) + earnedCoins;
      savePlayer();

      const rwCoins = document.getElementById('reward-coins');
      const rwStreak = document.getElementById('reward-streak');
      const rwStreakIcon = document.getElementById('reward-streak-icon');
      if (rwCoins) rwCoins.innerText = '+' + earnedCoins;
      if (rwStreak) rwStreak.innerText = 'Racha x' + player.streak;
      if (rwStreakIcon) rwStreakIcon.style.filter = "none";

      updateUI();
      if (window.checkBadges) window.checkBadges();

      let finContainer = document.getElementById('focus-finish-container');
      finContainer.style.display = 'flex';
      finContainer.classList.add('pulse-glow');

      let rwContainer = document.getElementById('victory-rewards');
      if (rwContainer) rwContainer.style.display = 'flex';
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
          actionBtn = `<button class="btn-secondary" onclick="equipAura('${item.id}')" style="width:100%; font-size:0.8rem; background:${isEquipped ? 'var(--accent-gold)' : '#111'}; color:${isEquipped ? '#000' : 'var(--accent-gold)'};">${isEquipped ? 'EQUIPADA' : 'EQUIPAR'}</button>`;
        } else if (item.type === 'lore') {
          actionBtn = `<button class="btn-secondary" onclick="readLore('${item.id}')" style="width:100%; font-size:0.8rem; border-color:#00ffff; color:#00ffff;">LEER TOMO</button>`;
        } else if (item.type === 'music') {
          actionBtn = `<button class="btn-secondary" disabled style="width:100%; font-size:0.8rem; opacity:0.8; cursor:default; background:#000; border-color:#555; color:#888;">USAR EN EMISORA ASTRAL</button>`;
        } else {
          actionBtn = `<button class="btn-secondary" disabled style="width:100%; font-size:0.8rem; opacity:0.5; cursor:not-allowed;">OBTENIDO</button>`;
        }
      }

      container.innerHTML += `
      <div style="background:#151515; border:1px solid #333; border-radius:10px; padding:15px; margin-bottom:15px; display:flex; gap:15px; align-items:center;">
        <div style="font-size:2.5rem; filter:drop-shadow(0 0 10px rgba(255,215,0,0.2));">${item.icon}</div>
        <div style="flex:1;">
          <h4 style="color:#eee; margin-bottom:5px; font-family:'Cinzel', serif; font-size:1.1rem;">${item.name}</h4>
          <p style="color:#888; font-size:0.8rem; line-height:1.4; margin-bottom:10px;">${item.desc}</p>
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
      if (window.UISoundEngine) window.UISoundEngine.playError();
      alert("No tienes suficientes monedas del Dojo.");
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

  window.applyInventory = function () {
    if (!player.unlockedItems) player.unlockedItems = [];

    if (player.activeAura) {
      let aura = STORE_ITEMS.find(i => i.id === player.activeAura);
      if (aura && aura.meta) {
        document.documentElement.style.setProperty('--accent-gold', aura.meta);
        document.documentElement.style.setProperty('--accent-gold-glow', aura.meta + '66');
      }
    } else {
      document.documentElement.style.setProperty('--accent-gold', '#ffd700');
      document.documentElement.style.setProperty('--accent-gold-glow', 'rgba(255, 215, 0, 0.4)');
    }

    const taikoBtn = document.getElementById('audio-taiko');
    if (taikoBtn) taikoBtn.style.display = player.unlockedItems.includes('mus_taiko') ? 'inline-block' : 'none';
    const synthBtn = document.getElementById('audio-synth');
    if (synthBtn) synthBtn.style.display = player.unlockedItems.includes('mus_synth') ? 'inline-block' : 'none';
  };

  window.readLore = function (id) {
    let item = STORE_ITEMS.find(i => i.id === id);
    if (item) {
      document.getElementById('lore-title').innerText = item.name.toUpperCase();
      document.getElementById('lore-body').innerHTML = '<p>' + item.meta.replace(/\n/g, '<br><br>') + '</p>';
      openModal('lore-modal');
    }
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
  };

  window.renderProfileVault = function () {
    const auraCont = document.getElementById('tab-auras');
    const loreCont = document.getElementById('tab-lore');
    const relicCont = document.getElementById('tab-relics');

    auraCont.innerHTML = '<h4 style="color:#555; font-size:0.7rem; margin-bottom:15px; letter-spacing:1px; text-align:center;">AUSENCIAS Y LUCES</h4>';
    loreCont.innerHTML = '<h4 style="color:#555; font-size:0.7rem; margin-bottom:15px; letter-spacing:1px; text-align:center;">CRÓNICAS DESBLOQUEADAS</h4>';
    relicCont.innerHTML = '<h4 style="color:#555; font-size:0.7rem; margin-bottom:15px; letter-spacing:1px; text-align:center;">RECUERDOS DE BATALLA</h4>';

    let hasAuras = false, hasLore = false, hasRelics = false;

    STORE_ITEMS.forEach(item => {
      if (!player.unlockedItems.includes(item.id)) return;

      let html = `
      <div style="background:#151515; border:1px solid #222; border-radius:8px; padding:12px; margin-bottom:10px; display:flex; align-items:center; gap:12px;">
        <div style="font-size:1.8rem;">${item.icon}</div>
        <div style="flex:1;">
          <div style="font-size:0.9rem; color:#eee; font-family:'Cinzel';">${item.name}</div>
          <div style="font-size:0.7rem; color:#666;">${item.desc.substring(0, 40)}...</div>
        </div>
    `;

      if (item.type === 'aura') {
        hasAuras = true;
        let isEq = player.activeAura === item.id;
        html += `<button class="btn-secondary" onclick="equipAura('${item.id}'); renderProfileVault();" style="font-size:0.6rem; padding:5px 10px; background:${isEq ? 'var(--accent-gold)' : '#000'}; color:${isEq ? '#000' : 'var(--accent-gold)'};">${isEq ? 'ACTIVA' : 'USAR'}</button></div>`;
        auraCont.innerHTML += html;
      } else if (item.type === 'lore') {
        hasLore = true;
        html += `<button class="btn-secondary" onclick="readLore('${item.id}')" style="font-size:0.6rem; padding:5px 10px; border-color:#00ffff; color:#00ffff;">RELEER</button></div>`;
        loreCont.innerHTML += html;
      } else if (item.type === 'relic') {
        hasRelics = true;
        html += `</div>`;
        relicCont.innerHTML += html;
      }
    });

    if (!hasAuras) auraCont.innerHTML += '<p style="color:#444; font-size:0.8rem; text-align:center; margin-top:20px;">No has adquirido esencias en el Bazar.</p>';
    if (!hasLore) loreCont.innerHTML += '<p style="color:#444; font-size:0.8rem; text-align:center; margin-top:20px;">No has recuperado fragmentos de historia.</p>';
    if (!hasRelics) relicCont.innerHTML += '<p style="color:#444; font-size:0.8rem; text-align:center; margin-top:20px;">Tu vitrina está vacía.</p>';
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
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  }

  function playBeep() {
    if (!audioCtx) return;
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
  }

  function playGong() {
    if (!audioCtx) return;
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

  document.getElementById('timer-stop').addEventListener('click', () => clearInterval(timerInterval));
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
