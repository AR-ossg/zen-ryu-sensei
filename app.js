// app.js

(function () {
  // El objeto `player` y su persistencia viven ahora en js/state.js
  // (window.ZenState). Aquí solo se mantiene la referencia — nunca se
  // reasigna el binding, solo se muta, así que sigue siendo el mismo
  // objeto que gestiona ZenState.
  const player = window.ZenState.getPlayer();

  // 6.0 Core Global Hooks & Scopes
  let wakeLock = null;
  let breathPhaseTimer = null;

  // BADGE_DB y STORE_ITEMS viven ahora en js/data.js (window.ZenData) —
  // catálogo de datos puro, sin lógica de UI ni de persistencia.
  const BADGE_DB = window.ZenData.BADGE_DB;
  const STORE_ITEMS = window.ZenData.STORE_ITEMS;

  let workoutHistory = [];
  window.getWorkoutHistory = () => workoutHistory; // el motor de rutinas la usa; NUNCA la reasigna, solo la muta en el sitio

  // STAT_LABELS vive ahora en js/data.js (window.ZenData) — dato estático puro.
  const STAT_LABELS = window.ZenData.STAT_LABELS;

  // El ritual de 7 toques solo tiene efecto si js/debug.js registró
  // window.cheatWealth (es decir, solo con ?debug=1 en la URL). En
  // producción esto es un no-op silencioso — ya no hay puerta trasera.
  let _ritualCount = 0;
  let _ritualTimer = null;
  window.handleAvatarRitual = function() {
    if (typeof window.cheatWealth !== 'function') return; // producción: sin efecto
    clearTimeout(_ritualTimer);
    _ritualCount++;
    if (_ritualCount >= 7) {
      window.cheatWealth();
      _ritualCount = 0;
    } else {
      _ritualTimer = setTimeout(() => { _ritualCount = 0; }, 2000);
    }
  };
  // debugSystem (Sincronizar Códice) es una utilidad normal, siempre
  // disponible — se define más abajo, junto a exportSave/importSave.

  window.sessionState = {
    active: false,
    gainedXP: { str: 0, spd: 0, flex: 0, end: 0 },
    levelUps: [],
    rankUpReady: false,
    reachedCap: false
  };

  // El wrapper de IndexedDB vive ahora en js/state.js — misma instancia,
  // solo referenciada aquí para no tocar el resto del archivo todavía.
  const zendb = window.ZenState.zendb;

  // export/import: la lectura/escritura de datos vive en ZenState;
  // aquí solo queda la parte de UI (descarga de archivo, selector de
  // archivo, notificaciones y el reload final).
  window.exportSave = async function () {
    const saveData = await window.ZenState.buildExportPayload();
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
        const ok = await window.ZenState.applyImportedSave(data);
        if (ok) {
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

  // Utilidad de mantenimiento — SIEMPRE disponible para cualquier usuario
  // (no es una herramienta de desarrollo): limpia el Service Worker y las
  // cachés locales, y fuerza la descarga de la última versión de la app.
  window.debugSystem = function () {
    const proceed = () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(regs => {
          for (let r of regs) r.unregister();
        });
      }
      if (window.caches) {
        caches.keys().then(names => { for (let n of names) caches.delete(n); });
      }
      location.replace(location.origin + location.pathname + '?v=' + Date.now());
    };
    if (window.showConfirm) {
      window.showConfirm(
        "El sistema buscará la versión más reciente del Códice y reiniciará la app para aplicarla. Tu progreso no sufrirá cambios. ¿Proceder?",
        "⛩️ Sincronizar Códice",
        proceed
      );
    } else {
      proceed();
    }
  };


  const rankTitles = window.ZenState.rankTitles;


  const getCurrentRank = window.ZenState.getCurrentRank;
  const savePlayer = window.ZenState.savePlayer;

  // loadPlayer: delega toda la carga/migración de datos en ZenState
  // (js/state.js, sin DOM) y aquí solo quedan los efectos de UI que
  // dependen de ese resultado — nada de lógica de persistencia.
  async function loadPlayer() {
    const { isNewPlayer, workoutHistory: loadedHistory } = await window.ZenState.loadPlayerData();
    workoutHistory = loadedHistory.slice(); // copia local: app.js la gestiona en memoria (unshift/pop) para el render

    if (isNewPlayer) {
      document.getElementById('onboarding-wizard').classList.remove('hide');
      document.getElementById('step-1').className = 'wizard-step active-step';
      return;
    }

    // Update PWA configs UI
    const voiceToggle = document.getElementById('voice-toggle');
    if (voiceToggle) voiceToggle.checked = player.voiceEnabled;
    const voiceSelectorEl = document.getElementById('voice-selector-container');
    if (voiceSelectorEl) voiceSelectorEl.style.display = player.voiceEnabled ? 'block' : 'none';

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
        setTimeout(() => {
          if (window.speechSynthesis.getVoices().length > 0) _populateVoiceSelector();
        }, 1000);
      }
    }

    document.getElementById('onboarding-wizard').classList.add('hide');
    applyInventory();
    checkBadges();
    updateBadgesUI();
    updateUI();
    updateCodexUI();
    updateLibraryUI();

    checkReengagement();
  }

  // ─────────────────────────────────────────────────────────────────────
  // ADHERENCIA / REENGANCHE — sin servidor, sin notificaciones push: se
  // evalúa cada vez que se abre la app y compara contra la última sesión
  // registrada con timestamp real. El tono escala con los días de ausencia
  // pero NUNCA es de culpa — el objetivo es que volver se sienta fácil,
  // no que dé vergüenza haberse ausentado.
  // ─────────────────────────────────────────────────────────────────────
  function checkReengagement() {
    if (!workoutHistory || workoutHistory.length === 0) return; // aún no ha entrenado ni una vez

    // No asumimos que el array viene ordenado (el orden de IndexedDB al
    // cargar no está garantizado como "más reciente primero" — solo lo es
    // dentro de la misma sesión, por el unshift). Buscamos el timestamp
    // más alto explícitamente.
    let mostRecentTimestamp = null;
    workoutHistory.forEach(h => {
      if (typeof h.timestamp === 'number' && (mostRecentTimestamp === null || h.timestamp > mostRecentTimestamp)) {
        mostRecentTimestamp = h.timestamp;
      }
    });
    if (mostRecentTimestamp === null) return; // historial legado sin timestamp — sin señal confiable

    const daysSince = Math.floor((Date.now() - mostRecentTimestamp) / 86400000);
    if (daysSince < 3) return; // ausencia corta, no hace falta decir nada

    let title, msg;
    if (daysSince < 7) {
      title = "⛩️ De Vuelta al Dojo";
      msg = `Han pasado ${daysSince} días desde tu última sesión. El templo no juzga las pausas — solo te espera. ¿Retomamos hoy, aunque sea con algo corto? Puedes marcar "poco tiempo hoy" en el check-in.`;
    } else if (daysSince < 14) {
      title = "⛩️ El Templo Te Espera";
      msg = `Ha pasado más de una semana (${daysSince} días). Está bien — la vida entrena tan duro como el dojo a veces. No hace falta recuperar el tiempo perdido de golpe: una sesión corta hoy ya es un paso real.`;
    } else {
      title = "⛩️ El Camino Sigue Aquí";
      msg = `Ha pasado bastante tiempo (${daysSince} días). Nada de eso borra lo que ya construiste. El camino sigue exactamente donde lo dejaste — retomar hoy, al ritmo que puedas, es lo único que importa.`;
    }
    setTimeout(() => showNotification(msg, title), 600);
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
    window._isIOSDevice = isIOS; // reutilizable desde otras partes de la app

    // Ya NO se muestra el gate de instalación automáticamente en cada carga
    // (antes era una pantalla completa que tapaba TODA la app en cada visita,
    // incluso para quien ya la había cerrado antes — muy agresivo). Ahora:
    // - Se ofrece una vez, en un momento de valor demostrado (justo tras la
    //   primera sesión completada), ver maybeShowInstallGate() más abajo.
    // - Si el usuario la cierra, no se vuelve a mostrar sola — pero queda
    //   siempre disponible desde Ajustes.
    if (btnInstall && gate) {
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

  // Muestra el gate de instalación — por defecto solo si no se había
  // descartado antes; con force=true (desde Ajustes) se muestra siempre.
  window.maybeShowInstallGate = function (force = false) {
    const gate = document.getElementById('install-gate');
    if (!gate) return;
    if (isStandalone()) return; // ya instalada, no tiene sentido insistir
    if (!force && localStorage.getItem('zenInstallGateDismissed') === '1') return;
    gate.style.display = 'flex';
  };

  window.dismissInstallGate = function () {
    localStorage.setItem('zenInstallGateDismissed', '1');
    const gate = document.getElementById('install-gate');
    if (gate) gate.style.display = 'none';
  };

  // Escapa HTML antes de insertar texto que podría venir de fuera de la app
  // (ej. un archivo de guardado importado) en un innerHTML. Los datos que
  // genera la propia app (nombres de ejercicio, insignias, etc.) no lo
  // necesitan porque vienen de nuestros catálogos fijos — esto es
  // específicamente para lo que un usuario podría inyectar vía importSave.
  function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

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
  window.switchView = switchView; // el motor de rutinas (js/routine-engine.js) la necesita

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

  // checkExamPending vive ahora en js/state.js (window.ZenState) — la usan
  // tanto la UI general como el motor de rutinas.
  const checkExamPending = window.ZenState.checkExamPending;

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

    let gems = document.getElementById('player-gems');
    if (gems) gems.innerText = player.gems || 0;

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
      let statEl = document.getElementById('stat-' + s);
      if (statEl) {
        statEl.innerText = "Lvl " + player.stats[s].lvl;
        // HUEVO DE PASCUA: Entrenamiento especializado al tocar el nombre/nivel
        const parent = statEl.closest('.hud-stat');
        if (parent) {
          parent.onclick = () => startSpecializedTraining(s);
        }
        // Progreso real por estadística — elemento propio de la app, con su
        // estilo (antes usaba el atributo title nativo del navegador, que se
        // ve como un tooltip de sistema ajeno al diseño y no funciona al
        // tacto en móvil; ahora es texto siempre visible bajo la barra).
        const etaEl = document.getElementById('stat-' + s + '-eta');
        if (etaEl) {
          etaEl.innerText = '';
          if (player.workoutCount >= 3 && player.stats[s].lvl < cap) {
            const xpNeeded = player.stats[s].lvl * 100 - player.stats[s].xp;
            const avgXpPerSession = (player.stats[s].xp + (player.stats[s].lvl - 1) * 100) / player.workoutCount;
            if (avgXpPerSession > 0) {
              const est = Math.ceil(xpNeeded / avgXpPerSession);
              etaEl.innerText = `~${est} ${est === 1 ? 'sesión' : 'sesiones'} más`;
            }
          }
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

      // Comunicar progreso real: además del %, una estimación de cuántas
      // sesiones más hacen falta, basada en el ritmo histórico propio del
      // jugador (no un número inventado). Solo se muestra con suficiente
      // historial para que la estimación no sea un tiro al aire.
      let progressText = `PROGRESO DE RANGO: ${Math.floor(percent)}%`;
      if (player.workoutCount >= 3) {
        let totalStatLevels = player.stats.str.lvl + player.stats.spd.lvl + player.stats.flex.lvl + player.stats.end.lvl;
        let avgLevelsPerSession = (totalStatLevels - 4) / player.workoutCount; // -4: todas las stats empiezan en nivel 1
        let remainingLevels = Math.max(0, totalNeeded - totalGained);
        if (avgLevelsPerSession > 0 && remainingLevels > 0) {
          let estimatedSessions = Math.ceil(remainingLevels / avgLevelsPerSession);
          progressText += ` (~${estimatedSessions} ${estimatedSessions === 1 ? 'sesión' : 'sesiones'} a tu ritmo)`;
        }
      }

      if (document.getElementById('xp-text-mini')) document.getElementById('xp-text-mini').innerText = progressText;
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
  window.updateUI = updateUI; // el motor de rutinas la necesita; también cierra un gap preexistente
                               // donde store.js/debug.js ya la llamaban vía window.updateUI sin que existiera

  // gainXP vive ahora en js/routine-engine.js (solo la llama completeFocusTask, que se mudó con ella).

  // NOTA: La lógica de notificaciones ahora se gestiona globalmente en index.html

  function showAscensionCard(rankObj) {
    const color = rankObj.color || '#FFD700';
    document.getElementById('asc-rank-icon').textContent = rankObj.icon;
    document.getElementById('asc-rank-title').textContent = rankObj.title.toUpperCase();
    document.getElementById('asc-rank-wisdom').textContent = '"' + (rankObj.wisdom || '') + '"';
    document.getElementById('asc-rank-lore').textContent = rankObj.lore || '';

    const jadeEl = document.getElementById('asc-jade-reward');
    if (jadeEl) {
      const earned = window._lastJadeEarned || 0;
      if (earned > 0) {
        document.getElementById('asc-jade-amount').textContent = earned;
        jadeEl.style.display = 'flex';
      } else {
        jadeEl.style.display = 'none';
      }
    }
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
  window.showAscensionCard = showAscensionCard; // el motor de rutinas la dispara al pasar un examen

  let codexCurrentSlide = 0;

  // ─────────────────────────────────────────────────────────────────────
  // SISTEMA DE PRESTIGIO — sumidero de fin de juego. Solo disponible en el
  // rango máximo (Dragón Ascendido). Reinicia SOLO el rango (no las
  // estadísticas) a cambio de una marca visual permanente (🌟) que nunca
  // se pierde, ni con futuros reforjados.
  //
  // Por qué NO se resetean los niveles de fuerza/velocidad/flex/resistencia:
  // el rango exige que las 4 stats alcancen el tope de nivel de ese rango
  // (ver checkExamPending). Si además se resetearan las stats a nivel 1,
  // alguien con un nivel físico real de verdad volvería a hacer ejercicios
  // triviales de principiante — ni es un premio ni tiene sentido como
  // entrenamiento. Al dejar las stats intactas, los 11 exámenes de ascenso
  // se re-habilitan de inmediato (las stats ya superan el tope de cada
  // rango), pero cada examen sigue generando una rutina exigente real,
  // calculada desde el nivel físico verdadero del jugador — reforjar es
  // "vuelve a demostrarlo", no "vuelve a empezar de cero".
  //
  // Lo que SÍ se conserva (a propósito, no es un borrado de progreso):
  // monedas restantes, Jade, reliquias/auras/marcos poseídos y su tier,
  // insignias, racha, historial de entrenamientos, y AHORA también el
  // nivel físico ganado. Solo se resetea el título de rango.
  // ─────────────────────────────────────────────────────────────────────
  const PRESTIGE_COST = 20000;

  window.performPrestige = function () {
    if (player.rankIndex < rankTitles.length - 1) return; // guarda: solo en rango máximo
    if ((player.coins || 0) < PRESTIGE_COST) {
      showNotification(`Reforjar el camino exige ${PRESTIGE_COST} Monedas Zen — un sacrificio digno de la cima. Sigue acumulando.`, "🌟 Sacrificio Insuficiente");
      return;
    }

    showConfirm(
      `Reforjar el camino te devolverá al primer título de rango y deberás volver a superar los 11 exámenes de ascenso. Tu nivel físico NO se pierde — seguirás siendo tan fuerte como hoy, así que cada examen seguirá siendo un desafío real, no un trámite. Tus monedas restantes, Jade, reliquias, insignias y racha tampoco se pierden. Ganarás una marca permanente de prestigio (🌟) que nadie te podrá quitar. ¿Estás seguro de trascender de nuevo?`,
      "🌟 Reforjar el Camino",
      () => {
        player.coins -= PRESTIGE_COST;
        player.rankIndex = 0;
        player.prestige = (player.prestige || 0) + 1;
        savePlayer();

        initAudio();
        playFanfare();
        if (typeof throwConfetti === 'function') throwConfetti();
        speakSensei(`El camino se reforja, guerrero. Portas ahora la marca de quien trascendió la cima misma. Tu fuerza permanece — ahora vuelve a demostrar tu honor a través de cada rango.`);

        updateUI();
        updateCodexUI();
        closeModal('codex-modal');
        window._lastJadeEarned = 0; // el prestigio en sí no otorga Jade — los exámenes que vienen después sí, como siempre
        setTimeout(() => showAscensionCard(getCurrentRank()), 700);
      }
    );
  };

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

    // Insignia de prestigio (solo si ya reforjó el camino al menos una vez)
    const prestigeBadge = document.getElementById('codex-prestige-badge');
    if (prestigeBadge) {
      if (player.prestige > 0) {
        prestigeBadge.style.display = 'block';
        prestigeBadge.innerText = '🌟'.repeat(Math.min(player.prestige, 5)) + (player.prestige > 5 ? ` x${player.prestige}` : '') + ' Camino Reforjado';
      } else {
        prestigeBadge.style.display = 'none';
      }
    }

    // Botón de Prestigio: solo visible en el rango máximo
    const prestigeBtn = document.getElementById('btn-prestige');
    if (prestigeBtn) {
      if (player.rankIndex >= rankTitles.length - 1) {
        prestigeBtn.style.display = 'block';
        prestigeBtn.innerText = `🌟 REFORJAR EL CAMINO (${PRESTIGE_COST} 🪙)`;
      } else {
        prestigeBtn.style.display = 'none';
      }
    }

    let hxHtml = workoutHistory.slice(-5).reverse().map(h => {
      const dateStr = escapeHtml(h.date || '');
      const typeStr = escapeHtml(h.type || (h.routine ? 'Entrenamiento' : 'Sesión'));
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


  window.openInfoModal = function (name, desc) {
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
    openModal('info-modal');
  }
  document.getElementById('info-close').addEventListener('click', () => {
    closeModal('info-modal');
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
    let filteredDB = EXERCISE_DB.filter(ex => ex.s === currentLibraryTab);

    // Búsqueda de texto (nombre técnico, nombre real o descripción)
    const searchEl = document.getElementById('library-search');
    const searchTerm = searchEl ? searchEl.value.trim().toLowerCase() : '';
    if (searchTerm) {
      filteredDB = filteredDB.filter(ex =>
        (ex.n && ex.n.toLowerCase().includes(searchTerm)) ||
        (ex.real && ex.real.toLowerCase().includes(searchTerm)) ||
        (ex.desc && ex.desc.toLowerCase().includes(searchTerm))
      );
    }

    // Filtro de equipamiento
    const equipEl = document.getElementById('library-equip-filter');
    const equipFilter = equipEl ? equipEl.value : 'all';
    if (equipFilter !== 'all') {
      filteredDB = filteredDB.filter(ex => ex.equip === equipFilter);
    }

    // Ocultar ejercicios que el jugador debería evitar por sus lesiones declaradas
    const hideInjuredEl = document.getElementById('library-hide-injured');
    if (hideInjuredEl && hideInjuredEl.checked && player.injuries && player.injuries.length > 0) {
      filteredDB = filteredDB.filter(ex => !(ex.avoidInjuries && ex.avoidInjuries.some(i => player.injuries.includes(i))));
    }

    if (filteredDB.length === 0) {
      listEl.innerHTML = `<p style="text-align:center; color:#555; font-style:italic; padding:40px 10px;">Ninguna técnica coincide con tu búsqueda o filtros. Prueba a ajustar los criterios.</p>`;
      return;
    }

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

  // El motor de rutinas completo (check-in, ACWR, balance push/pull,
  // periodización, generación y ejecución de la sesión, descanso
  // adaptativo, cierre con XP/monedas/racha) vive ahora en
  // js/routine-engine.js.

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

  // La tienda (openStoreModal, switchStoreTab, renderStore, buyStoreItem,
  // equipAura, toggleRelic, applyInventory) vive ahora en js/store.js.


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
    const frameCont = document.getElementById('tab-frames');

    if (auraCont) auraCont.innerHTML = '<h4 style="color:#555; font-size:0.7rem; margin-bottom:15px; letter-spacing:1px; text-align:center;">AUSENCIAS Y LUCES</h4>';
    if (booksCont) booksCont.innerHTML = '<h4 style="color:#555; font-size:0.7rem; margin-bottom:15px; letter-spacing:1px; text-align:center;">BIBLIOTECA ADQUIRIDA</h4>';
    if (relicCont) relicCont.innerHTML = '<h4 style="color:#555; font-size:0.7rem; margin-bottom:15px; letter-spacing:1px; text-align:center;">VITRINA DE ARTEFACTOS</h4>';
    if (frameCont) frameCont.innerHTML = '<h4 style="color:#555; font-size:0.7rem; margin-bottom:15px; letter-spacing:1px; text-align:center;">MARCOS DE AVATAR</h4>';

    let hasAuras = false, hasBooks = false, hasRelics = false, hasFrames = false;

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
      } else if (item.type === 'frame') {
        hasFrames = true;
        let isEq = player.activeFrame === item.id;
        html += `<button class="btn-secondary" onclick="equipFrame('${item.id}'); renderProfileVault();" style="font-size:0.6rem; padding:5px 10px; background:${isEq ? 'var(--accent-gold)' : '#000'}; color:${isEq ? '#000' : 'var(--accent-gold)'};">${isEq ? 'ACTIVO' : 'USAR'}</button></div>`;
        if (frameCont) frameCont.innerHTML += html;
      }
    });

    if (!hasAuras && auraCont) auraCont.innerHTML += '<p style="color:#444; font-size:0.8rem; text-align:center; margin-top:20px;">No has adquirido esencias en el Bazar.</p>';
    if (!hasBooks && booksCont) booksCont.innerHTML += '<p style="color:#444; font-size:0.8rem; text-align:center; margin-top:20px;">No has adquirido tomos de sabiduría en el Bazar.</p>';
    if (!hasRelics && relicCont) relicCont.innerHTML += '<p style="color:#444; font-size:0.8rem; text-align:center; margin-top:20px;">Tu vitrina está vacía.</p>';
    if (!hasFrames && frameCont) frameCont.innerHTML += '<p style="color:#444; font-size:0.8rem; text-align:center; margin-top:20px;">No has adquirido marcos en el Bazar.</p>';
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
  // El motor de rutinas (js/routine-engine.js) necesita estas cinco:
  window.playBeep = playBeep;
  window.playGong = playGong;
  window.playFanfare = playFanfare;
  window.playWhoosh = playWhoosh;
  window.throwConfetti = throwConfetti;

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


  // --- SENSEI VOICE ENGINE (Web Speech & Local Neural TTS) ---

  let _senseiVoice = null;

  function _populateVoiceSelector () {
    if (!window.speechSynthesis) return;
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return;

    const sel = document.getElementById('voice-select');
    if (!sel) return;

    sel.innerHTML = '';

    // Only show Spanish voices
    const esVoices = voices.filter(v => v.lang.startsWith('es'));

    // Marcadores de calidad: iOS/Android/Chrome etiquetan sus mejores voces
    // con estas palabras (Enhanced, Neural, Wavenet, Premium, Natural...).
    // Priorizarlas es lo único que realmente ayuda a la calidad percibida —
    // el resto de la heurística (nombre masculino) es solo preferencia de
    // personaje, no de calidad.
    const isHighQuality = (v) => /enhanced|neural|wavenet|premium|natural/i.test(v.name) || /enhanced|neural|wavenet|premium|natural/i.test(v.voiceURI);

    // Rank Spanish voices: calidad primero, luego nombre masculino, luego el resto
    const esHQ = esVoices.filter(isHighQuality);
    const esMale = esVoices.filter(v => !isHighQuality(v) && (
      /jorge|pablo|diego|miguel|antonio|carlos|alvaro|juan|enrique|dario|julio|masculino|male|hombre/i.test(v.name) ||
      /jorge|pablo|diego|miguel|antonio|carlos|alvaro|juan|enrique|dario|julio|masculino|male|hombre/i.test(v.voiceURI)
    ));
    const esOther = esVoices.filter(v => !esHQ.includes(v) && !esMale.includes(v));
    const ordered = [...esHQ, ...esMale, ...esOther];

    if (ordered.length === 0) {
      // Fallback: no Spanish voices found, show a placeholder
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = '⚠️ No hay voces en español instaladas';
      sel.appendChild(opt);
    } else {
      ordered.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v.voiceURI;
        // Label: show name + region + quality hint if available
        const quality = isHighQuality(v) ? '✨' : (v.localService ? '(local)' : '(online)');
        opt.textContent = `${v.name} – ${v.lang} ${quality}`;
        sel.appendChild(opt);
      });
    }

    // Update voice count badge
    const countEl = document.getElementById('voice-count-badge');
    if (countEl) countEl.textContent = ordered.length > 0 ? `${ordered.length} voces en español` : 'Sin voces en español';

    // Restore saved choice or auto-select best Spanish voice (calidad > nombre masculino > cualquiera)
    if (player.savedVoiceURI) {
      sel.value = player.savedVoiceURI;
      // If saved voice not in list (maybe it disappeared), fallback gracefully
      if (!sel.value && ordered.length > 0) sel.value = ordered[0].voiceURI;
    } else if (ordered.length > 0) {
      sel.value = ordered[0].voiceURI;
    }

    // Sync _senseiVoice to current selection
    _senseiVoice = voices.find(v => v.voiceURI === sel.value) || (esVoices[0] || voices[0] || null);

    // Aviso único: si estamos en iOS y NINGUNA voz española es de alta calidad,
    // sugerir descargar una voz mejorada — es lo único que de verdad sube la
    // calidad ahí, y no podemos hacerlo por el usuario desde la web.
    const isIOSHere = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (isIOSHere && esHQ.length === 0 && esVoices.length > 0 && !localStorage.getItem('zenVoiceTipShown')) {
      localStorage.setItem('zenVoiceTipShown', '1');
      setTimeout(() => {
        if (window.showNotification) {
          window.showNotification(
            "Tu iPhone solo tiene voces básicas en español instaladas. Para que el Sensei suene más natural, puedes descargar una voz mejorada gratis en Ajustes → Accesibilidad → Contenido Hablado → Voces → Español, y elegir cualquiera marcada como 'Mejorada'.",
            "🔊 Voz del Sensei"
          );
        }
      }, 2500);
    }
  }

  function _loadSenseiVoice () {
    if (!window.speechSynthesis) return;
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return;

    _populateVoiceSelector();

    // If no manual choice made yet, auto-select best Spanish voice (calidad primero)
    if (!player.savedVoiceURI) {
      const isHighQuality = (v) => /enhanced|neural|wavenet|premium|natural/i.test(v.name) || /enhanced|neural|wavenet|premium|natural/i.test(v.voiceURI);
      const preferredNames = ['jorge', 'pablo', 'diego', 'miguel', 'antonio', 'carlos', 'alvaro', 'juan', 'enrique', 'dario', 'julio', 'male'];
      _senseiVoice =
        voices.find(v => v.lang.startsWith('es') && isHighQuality(v)) ||
        voices.find(v => v.lang.startsWith('es') && preferredNames.some(n => v.name.toLowerCase().includes(n))) ||
        voices.find(v => v.lang.startsWith('es')) ||
        voices[0] || null;
    }
  }

  if (window.speechSynthesis) {
    _loadSenseiVoice();
    window.speechSynthesis.addEventListener('voiceschanged', _loadSenseiVoice);
    // iOS: voices can load very late. Retry a few times to catch them.
    [500, 1500, 3000, 6000].forEach(delay => {
      setTimeout(() => {
        if (window.speechSynthesis.getVoices().length > 0) _loadSenseiVoice();
      }, delay);
    });
  }

  // Wire up manual "Recargar Voces" button
  window.reloadVoices = function () {
    if (!window.speechSynthesis) return;
    _loadSenseiVoice();
    const btn = document.getElementById('btn-reload-voices');
    if (btn) {
      btn.textContent = '✅ Voces recargadas';
      setTimeout(() => { btn.textContent = '🔄 Recargar Voces'; }, 2000);
    }
  };

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
  window.speakSensei = speakSensei; // el motor de rutinas la necesita

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
  window.requestWakeLock = requestWakeLock; // el motor de rutinas la usa al empezar una sesión

  async function releaseWakeLock () {
    if (!wakeLock) return;
    try { await wakeLock.release(); } catch (e) { /* ignore */ }
    wakeLock = null;
    console.log('ZenRyu: Wake Lock released');
  }
  window.releaseWakeLock = releaseWakeLock; // el motor de rutinas la usa al terminar una sesión

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
  window.startBreathing = startBreathing; // el motor de rutinas la necesita

  function stopBreathing() {
    clearTimeout(breathPhaseTimer);
    breathPhaseTimer = null;
    const label = document.getElementById('breath-label');
    if (label) label.textContent = '';
  }
  window.stopBreathing = stopBreathing; // el motor de rutinas la necesita

  window.saveWorkoutFeedback = function (val) {
    if (!val) return;
    player.lastWorkoutFeedback = val;
    savePlayer();
    document.querySelectorAll('[data-feedback-btn]').forEach(btn => {
      const isSelected = btn.dataset.feedbackBtn === val;
      btn.style.background = isSelected ? 'var(--accent-gold)' : 'rgba(255,215,0,0.06)';
      btn.style.color = isSelected ? '#000' : 'rgba(255,215,0,0.8)';
    });
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

  // El generador de rutinas es ahora exclusivamente local (ver generateOfflineRoutine
  // más arriba, que ya consume window.dailyCheckin). No hay llamadas a servicios externos.

  // ====== END 6.0 INTELLIGENT FEATURES ======

  // Hook openModal to refresh the voice dropdown dynamically when Settings is opened
  window.addEventListener('load', () => {
    const originalOpenModal = window.openModal;
    window.openModal = function (id) {
      if (id === 'settings-modal') {
        _populateVoiceSelector();
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
