// app.js

(function() {
  let player = {
    name: "",
    rankIndex: 0,
    stats: {
      str: { lvl: 1, xp: 0 },
      spd: { lvl: 1, xp: 0 },
      flex: { lvl: 1, xp: 0 },
      end: { lvl: 1, xp: 0 }
    },
    workoutCount: 0
  };

  let workoutHistory = [];

  // --- NATIVE INDEXEDDB WRAPPER ---
  const zendb = {
     db: null,
     init: function() {
         return new Promise((resolve, reject) => {
             let req = indexedDB.open("ZenRyuDB", 1);
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


  const rankTitles = [
    { max: 4, title: "Semilla Inactiva", icon: "🌰" },
    { max: 9, title: "Brote de Bambú", icon: "🌱" },
    { max: 19, title: "Grulla de Piedra", icon: "🪨" },
    { max: 29, title: "Tigre Enfocado", icon: "🐅" },
    { max: 39, title: "Mantis de Hierro", icon: "🦗" },
    { max: 49, title: "Guerrero Esmeralda", icon: "⚔️" },
    { max: 59, title: "Sombra del Viento", icon: "🌪️" },
    { max: 69, title: "Maestro del Silencio", icon: "🤫" },
    { max: 79, title: "Alma de Acero", icon: "🦾" },
    { max: 89, title: "Oráculo Corporal", icon: "🧿" },
    { max: 99, title: "Demonio Consagrado", icon: "👹" },
    { max: 999, title: "Dragón Ascendido", icon: "🐉" }
  ];

  let currentRoutine = [];

  function getCurrentRank() {
    return rankTitles[player.rankIndex] || rankTitles[rankTitles.length - 1];
  }

  function savePlayer() {
    localStorage.setItem("zenWarriorPwaSave", JSON.stringify(player));
    localStorage.setItem("zenWarriorHistory", JSON.stringify(workoutHistory));
  }

  async function loadPlayer() {
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
            player.stats = { str: {lvl:1,xp:0}, spd: {lvl:1,xp:0}, flex: {lvl:1,xp:0}, end: {lvl:1,xp:0} };
         }
      }
      if (typeof player.workoutCount === 'undefined') player.workoutCount = 0;
      closeModal('onboarding-wizard');
      updateUI();
    } else {
      openModal('onboarding-wizard');
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
    
    // Siempre lo mostramos si NO estamos en la app instalada (standalone)
    if (btnInstall && gate && !isStandalone()) {
      gate.style.display = 'flex';
      
      btnInstall.addEventListener('click', async () => {
        if(navigator.vibrate) navigator.vibrate(50);
        
        if (deferredPrompt) {
           // Si Android nos dio el prompt nativo, lo usamos (1-clic)
           deferredPrompt.prompt();
           const { outcome } = await deferredPrompt.userChoice;
           if (outcome === 'accepted') {
               gate.style.display = 'none';
           }
           deferredPrompt = null;
        } else {
           // Si es iOS o Android no proporcionó prompt nativo, mostramos instrucciones
           openModal('pwa-modal');
        }
      });
    }
  });

  function switchView(viewToShow, viewToHide) {
    if (!document.startViewTransition) {
       document.getElementById(viewToHide).className = 'hidden-view';
       document.getElementById(viewToShow).className = 'active-view';
       return;
    }
    document.startViewTransition(() => {
       document.getElementById(viewToHide).className = 'hidden-view';
       document.getElementById(viewToShow).className = 'active-view';
    });
  }

  // ONBOARDING WIZARD
  window.nextWizardStep = function(currentStep) {
    let inputsCheck = {
      1: 'ob-name',
      2: 'ob-str',
      3: 'ob-spd',
      4: 'ob-flex'
    };
    
    let el = document.getElementById(inputsCheck[currentStep]);
    if(el && el.value.trim() === '') {
      showNotification("Por honor, no dejes campos en blanco.", "Aviso");
      return;
    }

    document.getElementById('step-' + currentStep).className = 'wizard-step hidden-step';
    document.getElementById('step-' + (currentStep + 1)).className = 'wizard-step active-step';
  }

  window.finishWizard = function() {
    let endVal = document.getElementById('ob-end').value;
    if(endVal.trim() === '') {
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
    closeModal('onboarding-wizard');
    showNotification("Perfil Forjado con Especializaciones.\nBienvenido al Sendero, " + player.name, "Iniciación");
    updateUI();
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
    document.getElementById('player-sessions').innerText = player.workoutCount;

    let cap = rObj.max;
    ['str', 'spd', 'flex', 'end'].forEach(s => {
       document.getElementById('stat-' + s).innerText = "Lvl " + player.stats[s].lvl;
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
      if(document.getElementById('xp-text-mini')) document.getElementById('xp-text-mini').innerText = `¡EXAMEN DISPONIBLE!`;
      document.getElementById('xp-bar').style.width = '100%';
      document.getElementById('xp-bar').style.background = 'linear-gradient(90deg, #ff0000, #ff5555)';
      
      let btnCond = document.getElementById('btn-start-conditioning');
      if(btnCond) {
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
      
      if(document.getElementById('xp-text-mini')) document.getElementById('xp-text-mini').innerText = `PROGRESO DE RANGO: ${Math.floor(percent)}%`;
      document.getElementById('xp-bar').style.width = percent + '%';
      document.getElementById('xp-bar').style.background = 'linear-gradient(90deg, #b8860b, var(--accent-gold))';
      
      let btnCond = document.getElementById('btn-start-conditioning');
      if(btnCond) {
          btnCond.style.borderColor = '';
          btnCond.innerHTML = `
            <div class="mission-status"><span>ACONDICIONAMIENTO MARCIAL</span> <span></span></div>
            <h2 class="mission-title">FUERZA Y<br>POTENCIA</h2>
            <div class="mission-stats">
              <span>PURO IMPACTO</span> <span>/</span> <span>EXPLOSIVIDAD</span> <span>/</span> <span>ACERO CORE</span>
            </div>`;
      }
    }
  }

  function gainXP(amount, statAlias) {
    if (checkExamPending()) return; 
    
    let cap = getCurrentRank().max;
    let stat = player.stats[statAlias];
    
    if (stat.lvl >= cap) {
       showNotification("Esta capacidad ha llegado a su tope momentáneo. Necesitas evolucionar tus otras disciplinas físicas y luego superar el Examen Final para ascender de Rango.", "Cuerpo al Límite");
       return;
    }
    
    stat.xp += amount;
    let requiredXp = stat.lvl * 100;
    
    if (stat.xp >= requiredXp) {
      stat.xp -= requiredXp;
      stat.lvl++;
      showNotification(`¡Tu disciplina en ${statAlias.toUpperCase()} ha evolucionado al Nivel ${stat.lvl}!`, "🌟 DESBLOQUEO FÍSICO");
      
      if (checkExamPending()) {
         showNotification("Estás bloqueado en la cúspide de tu rango. Es hora de demostrar si eres digno del siguiente paso en el escalafón. Tu próxima Misión de Acondicionamiento será un EXAMEN DE ASCENSO.", "Examen Máximo Disponible");
      }
    }
    
    savePlayer();
    updateUI();
  }

  let currentNotiCallback = null;
  function showNotification(msg, title, callback = null) {
    document.getElementById('noti-title').innerText = title;
    document.getElementById('noti-msg').innerText = msg;
    openModal('notification-modal');
    currentNotiCallback = callback;
  }

  document.getElementById('noti-close').addEventListener('click', () => {
    closeModal('notification-modal');
    if(currentNotiCallback) {
        currentNotiCallback();
        currentNotiCallback = null;
    }
  });

  window.openInfoModal = function(name, desc, imgUrl) {
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
        <img src="${imgUrl}" class="zoomable-image" onclick="openLightbox(this.src)" onclick="openLightbox(this.src)" style="width:100%; border-radius:8px; border:1px solid var(--accent-gold);">
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

  window.openCodexModal = function() {
    let html = '';
    rankTitles.forEach((r, idx) => {
       let isAcquired = player.rankIndex >= idx;
       let isCurrent = player.rankIndex === idx;
       let color = isCurrent ? 'var(--accent-gold)' : (isAcquired ? '#fff' : '#444');
       let req = r.max === 999 ? 'Nivel Máximo' : `Límite Lvl ${r.max}`;
       
       html += `<div style="display:flex; justify-content:space-between; align-items:center; padding: 10px 0; border-bottom:1px solid #222; color:${color}; ${isCurrent ? 'background:rgba(255,215,0,0.1); padding:10px; border-radius:6px; font-weight:bold;' : ''}">
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="font-size:1.5rem; filter:${isAcquired ? 'grayscale(0)' : 'grayscale(1)'}; text-shadow:0 0 5px ${color};">${r.icon}</span>
            <span style="font-family:'Cinzel'; font-size:1rem; text-transform:uppercase;">${r.title}</span>
          </div>
          <div style="font-size:0.75rem; color:#888;">${req}</div>
       </div>`;
    });
    document.getElementById('codex-list').innerHTML = html;
    document.getElementById('codex-sessions').innerText = player.workoutCount;
    
    let hxHtml = workoutHistory.map(h => `<div style="margin-bottom:8px; border-left:2px solid var(--accent-gold); padding-left:8px;"><span style="color:var(--text-dim);">${h.date}</span><br><span style="color:#fff;">${h.type}</span></div>`).join('');
    if(workoutHistory.length === 0) hxHtml = "<span style='color:#666; font-style:italic;'>Aún no hay gestas registradas.</span>";
    let hxContainer = document.getElementById('codex-history');
    if(hxContainer) hxContainer.innerHTML = hxHtml;

    openModal('codex-modal');
  }

  window.openLibraryModal = function() {
    let content = '';
    
    EXERCISE_DB.forEach(ex => {
        let pLvl = player.stats[ex.s]?.lvl || 1;
        let isLocked = ex.lvl_min > pLvl;
        let displayName = isLocked ? "??? (Técnica Bloqueada)" : ex.n + " - " + ex.real;
        let displayDesc = isLocked ? `Requiere Nivel ${ex.lvl_min} físico de ${ex.s.toUpperCase()} para desbloquear.` : ex.desc;
        let imgStyle = isLocked ? "filter: blur(8px) grayscale(1) brightness(0.5); opacity: 0.6;" : "";
        let borderCol = isLocked ? '#222' : 'var(--accent-gold)';
        
        let typeBadge = '';
        if(ex.s === "str") typeBadge = '<span style="background:#8f2020; color:#fff; padding:2px 6px; border-radius:4px; font-size:0.7rem;">FUERZA</span>';
        if(ex.s === "spd") typeBadge = '<span style="background:#5555ff; color:#fff; padding:2px 6px; border-radius:4px; font-size:0.7rem;">VELOCIDAD</span>';
        if(ex.s === "end") typeBadge = '<span style="background:#555555; color:#fff; padding:2px 6px; border-radius:4px; font-size:0.7rem;">AGUANTE</span>';
        if(ex.s === "flex") typeBadge = '<span style="background:#28a745; color:#fff; padding:2px 6px; border-radius:4px; font-size:0.7rem;">FLEX</span>';

        content += `
        <div style="background:#151515; border: 1px solid ${borderCol}; border-radius:8px; padding:12px; margin-bottom:15px; display:flex; gap:15px; align-items:center;">
          <div style="width:80px; height:80px; flex-shrink:0; border-radius:6px; overflow:hidden; border:1px solid #333; background:#000;">
             <img src="${ex.m}" style="width:100%; height:100%; object-fit:cover; ${imgStyle}">
          </div>
          <div style="flex-grow:1;">
             <h3 style="color:${isLocked ? '#666' : '#fff'}; font-family:'Cinzel'; font-size:0.95rem; margin:0 0 5px 0; line-height:1.2;">${displayName}</h3>
             ${isLocked ? '' : `<div style="margin-bottom:8px;">${typeBadge} <span style="color:#888; font-size:0.7rem; margin-left:5px;">Nivel: ${ex.lvl_min}</span></div>`}
             <p style="color:${isLocked ? '#ff5555' : '#aaa'}; font-size:0.8rem; line-height:1.4; margin:0;">${displayDesc}</p>
          </div>
        </div>`;
    });

    document.getElementById('library-list').innerHTML = content;
    openModal('library-modal');
  }

  // ORÁCULO OFFLINE (MOTOR PROCEDIMENTAL)
  function generateOfflineRoutine(type = 'conditioning') {
    document.getElementById('loader').style.display = 'block';
    
    setTimeout(() => {
      // 1. Filtrar base de datos según nivel individual y el tipo (domain)
      let validExercises = EXERCISE_DB.filter(ex => {
         let pLvl = player.stats[ex.s]?.lvl || 1;
         let topLimit = window.isExamRoutine ? ex.lvl_max + 10 : ex.lvl_max;
         return pLvl >= ex.lvl_min && pLvl <= topLimit && ex.domain === type;
      });
      
      // Si por alguna razón no hay validos, relajar el nivel
      if(validExercises.length < 5) validExercises = EXERCISE_DB.filter(ex => ex.domain === type);
      if(validExercises.length === 0) validExercises = EXERCISE_DB; // Failsafe extremo

      // 2. Seleccionar 4 o 5 aleatorios dependiendo del tipo
      let shuffled = validExercises.sort(() => 0.5 - Math.random());
      let selected = shuffled.slice(0, type === 'mobility' ? 4 : 5);

      // 3. Escalar matemáticamente
      let routine = selected.map(ex => {
        let isExam = window.isExamRoutine;
        let pLvl = player.stats[ex.s]?.lvl || 1;
        let virtualLevel = isExam ? ex.lvl_max : pLvl;
        
        let factor = (virtualLevel - ex.lvl_min) * ex.scale;
        let finalVal = Math.floor(Math.max(ex.baseVal, ex.baseVal + factor));
        let numSets = type === 'mobility' ? 2 : (player.level > 20 ? 4 : 3);
        if(isExam) numSets += 1;
        
        return {
          id: ex.id,
          n: `${ex.n} (${ex.real})`,
          r: `${finalVal} ${ex.t === "time" ? "segs" : "reps"}`,
          t: ex.t,
          val: finalVal,
          s: ex.s,
          sets: numSets,
          desc: ex.desc,
          m: ex.m,
          alt: ex.alt
        };
      });

      currentRoutine = routine; // Se guarda en variable global para mutaciones
      closeModal('loader');
      renderExercises(routine);

    }, 600); // Simulamos "Carga Neural" para efecto inmersivo
  }

  const startRoutineHandler = (type = 'conditioning') => {
    let examPending = checkExamPending();
    if(examPending && type === 'conditioning') {
       showNotification("El Oráculo observa tu espíritu. Estás a punto de iniciar una Prueba de Ascenso. Sé absolutamente sincero: marca como terminada una serie SÓLO si realmente lograste el esfuerzo estricto y la técnica correcta. Engañar al sistema hoy significa lesionarte mañana en niveles superiores. El honor no admite auto-trampas.", "Examen Marcial de Honor", () => {
           window.isExamRoutine = true;
           initRoutineGeneration(type);
       });
       return;
    } else if (examPending && type === 'mobility') {
       showNotification("Debes probar tu valía física en el Examen de Ascenso antes de recuperar el aliento en la movilidad.", "Disciplina");
       return;
    }
    
    window.isExamRoutine = false;
    initRoutineGeneration(type);
  };

  function initRoutineGeneration(type) {
    switchView('routine-view', 'home-view');
    closeModal('btn-finish-routine');
    document.getElementById('exercises-list').innerHTML = '';
    generateOfflineRoutine(type);
  }

  if(document.getElementById('btn-start-conditioning')) document.getElementById('btn-start-conditioning').addEventListener('click', () => startRoutineHandler('conditioning'));
  if(document.getElementById('btn-start-mobility')) document.getElementById('btn-start-mobility').addEventListener('click', () => startRoutineHandler('mobility'));

  document.getElementById('btn-cancel-routine').addEventListener('click', () => {
    if(window.isExamRoutine) {
       let cap = getCurrentRank().max;
       ['str','spd','flex','end'].forEach(s => {
          player.stats[s].lvl = Math.max(1, cap - 1);
          player.stats[s].xp = (cap - 1) * 80;
       });
       savePlayer();
       updateUI();
       showNotification("Un guerrero conoce sus límites. Te has retirado del Examen de Ascenso. Has retrocedido en tu maestría para forjarte de nuevo.", "Retorno a las Sombras");
    }
    switchView('home-view', 'routine-view');
  });

  document.getElementById('btn-finish-routine').addEventListener('click', () => {
    if(window.isExamRoutine) {
       player.rankIndex++; 
       ['str','spd','flex','end'].forEach(s => { player.stats[s].xp = 0; });
       initAudio();
       playFanfare();
       throwConfetti();
       showNotification(`¡HAS TRASCENDIDO TUS LÍMITES!\n\nAscendiendo en maestría.\nHas alcanzado el Rango: ${getCurrentRank().title}`, "Evolución Marcial Completada");
    } else {
       showNotification("Ha sido una sesión exigente. Has forjado tu espíritu y sumado una Victoria Histórica a tu perfil.", "✅ Reposo del Guerrero");
    }
    
    if(navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);
    let typeName = window.isExamRoutine ? "Examen Marcial" : (currentRoutine[0]?.domain === 'mobility' ? "Flexibilidad Activa" : "Acondicionamiento Físico");
    workoutHistory.unshift({ date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), type: typeName });
    if(workoutHistory.length > 50) workoutHistory.pop();

    player.workoutCount++;
    savePlayer();
    switchView('home-view', 'routine-view');
    document.getElementById('exercises-list').innerHTML = '';
    updateUI();
  });

  // MUTACIÓN (ALTERNATIVA)
  window.mutateExercise = function(index, baseId) {
    let exObj = EXERCISE_DB.find(x => x.id === baseId);
    if(exObj && exObj.alt) {
       let current = currentRoutine[index];
       current.n = `${exObj.alt.n} (${exObj.alt.real})`;
       current.desc = exObj.alt.desc;
       current.m = exObj.alt.m || ""; 
       current.alt = null; // ya fue mutado
       renderExercises(currentRoutine); // re-render completo rápido
       showNotification("El Oráculo ha adaptado la técnica a tus circunstancias.", "Mutación Física");
    }
  }

  function renderExercises(exercises) {
    let container = document.getElementById('exercises-list');
    container.innerHTML = '';
    
    if(exercises && exercises.length > 0) closeModal('btn-finish-routine');

    exercises.forEach((ex, index) => {
      let isTime = ex.t === 'time' || ex.t === 'tiempo';
      let numericVal = parseInt(ex.val) || 0;
      let timerBtn = isTime && numericVal > 0 
        ? `<button class="btn-secondary" style="width:auto;" onclick="openTimer(${numericVal})">⏱️ Temp. ${numericVal}s</button>`
        : `<button class="btn-secondary" style="width:auto;" onclick="openTimer(60)">⏱️ Descanso 60s</button>`;
      
      let safeImg = ex.m && (ex.m.startsWith('http') || ex.m.startsWith('./')) ? ex.m : '';
      let safeDesc = (ex.desc || "").replace(/'/g, "\\'").replace(/"/g, '&quot;');
      let safeN = (ex.n || "").replace(/'/g, "\\'").replace(/"/g, '&quot;');

      let altBtn = (ex.alt && !window.isExamRoutine) ? `<button class="btn-secondary" style="border-color:var(--accent-red); color:#ff5555; width:100%; margin-top:5px; font-weight:700;" onclick="mutateExercise(${index}, '${ex.id}')">🔄 TÉCNICA ALTERNATIVA (Regresión / Adaptación)</button>` : '';

      let cardHtml = `
        <div class="exercise-card" id="ex-${index}">
          <div class="exercise-header">
            <span>${ex.n}</span>
            <span class="exercise-stat-badge">${(ex.s || 'str').toUpperCase()}</span>
          </div>
          <div style="font-size: 0.9rem; margin-bottom: 5px; color: #444;">
           <strong>${ex.sets} SERIES ✕ ${ex.r.toUpperCase()}</strong>
          </div>
          <div style="display: flex; gap: 8px; margin-top: 15px; width: 100%;">
           <button class="btn-complete-massive" onclick="completeTask(${index}, '${ex.s || 'str'}')">✔️ FORJAR (+20 XP)</button>
          </div>
          ${altBtn}
          <div style="display: flex; gap: 8px; margin-top: 5px; width: 100%;">
            <button class="btn-secondary" style="width:50%;" onclick="openInfoModal('${safeN}', '${safeDesc}', '${safeImg}')">👁️ Técnica</button>
            ${timerBtn}
          </div>
        </div>
      `;
      container.innerHTML += cardHtml;
    });
  }

  window.checkAllTasksCompleted = function() {
    let cards = document.querySelectorAll('.exercise-card');
    let completed = document.querySelectorAll('.exercise-card .btn-complete-massive:disabled');
    if(cards.length > 0 && cards.length === completed.length) {
      let finBtn = document.getElementById('btn-finish-routine');
      finBtn.style.display = 'block';
      finBtn.classList.add('pulse-glow');
      finBtn.innerText = "🏆 FINALIZAR ENTRENAMIENTO";
      setTimeout(() => finBtn.scrollIntoView({behavior: 'smooth', block: 'end'}), 300);
    }
  }

  window.completeTask = function(index, statAlias) {
    if(navigator.vibrate) navigator.vibrate(50);
    let s = "str";
    if (statAlias.toLowerCase().includes("spd")) s = "spd";
    if (statAlias.toLowerCase().includes("flex")) s = "flex";
    if (statAlias.toLowerCase().includes("end")) s = "end";
    
    gainXP(20, s); 
    
    let card = document.getElementById(`ex-${index}`);
    if(card) {
      card.style.opacity = '0.7'; 
      card.style.borderColor = 'var(--accent-green)';
      let btn = card.querySelector('.btn-complete-massive');
      if(btn) { 
        btn.innerHTML = "✅ DISCIPLINA FORJADA"; 
        btn.disabled = true; 
        btn.style.boxShadow = 'none';
        btn.style.background = 'rgba(40,167,69,0.15)';
      }
    }
    showNotification(`Tu disciplina ha forjado +20 XP en ${s.toUpperCase()}.\n\nEl dolor es debilidad abandonando el cuerpo.`, "🥊 Esfuerzo Honrado");
    checkAllTasksCompleted();
  }

  // AUDIO RADIO
  const audio = document.getElementById('audio-player');
  document.querySelectorAll('.radio-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.radio-btn').forEach(b => b.classList.remove('active'));
      if (this.id === 'radio-stop') {
        audio.pause();
        return;
      }
      this.classList.add('active');
      audio.src = this.getAttribute('data-url');
      audio.play().catch(e => console.log("Auto-play blocked"));
    });
  });

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
        osc.frequency.setValueAtTime(f, t + i*0.12);
        gain.gain.setValueAtTime(0, t + i*0.12);
        gain.gain.linearRampToValueAtTime(0.1, t + i*0.12 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i*0.12 + 0.3);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(t + i*0.12);
        osc.stop(t + i*0.12 + 0.3);
    });
  }

  function throwConfetti() {
    const colors = ['#ffd700', '#28a745', '#ff5555', '#ffffff'];
    for(let i=0; i<80; i++) {
        let d = document.createElement('div');
        d.style.position = 'fixed';
        d.style.zIndex = '99999';
        d.style.width = '8px';
        d.style.height = '16px';
        d.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        d.style.top = '-20px';
        d.style.left = (Math.random() * 100) + 'vw';
        d.style.opacity = Math.random() + 0.5;
        d.style.transform = 'rotate(' + (Math.random() * 360) + 'deg)';
        d.style.pointerEvents = 'none';
        
        document.body.appendChild(d);
        
        let tx = (Math.random() - 0.5) * 300; 
        let ty = window.innerHeight + 100; 
        let duration = 2000 + Math.random() * 3000;
        
        d.animate([
            { transform: 'translate3d(0, 0, 0) rotate(0deg)' },
            { transform: 'translate3d(' + tx + 'px, ' + ty + 'px, 0) rotate(' + (360 + Math.random()*360) + 'deg)' }
        ], {
            duration: duration,
            easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            fill: 'forwards'
        });
        
        setTimeout(() => d.remove(), duration);
    }
  }

  window.openTimer = function(seconds) {
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
           if(navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400]);
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

  let initialQuote = zenQuotes[Math.floor(Math.random() * zenQuotes.length)];
  let quoteEl = document.getElementById('maestro-quote');
  if(quoteEl) quoteEl.innerText = '"' + initialQuote + '"';

  loadPlayer();
})();
