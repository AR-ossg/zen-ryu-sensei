// app.js

(function() {
  let player = {
    name: "",
    level: 1,
    xp: 0,
    stats: { str: 0, spd: 0, flex: 0, end: 0 },
    workoutCount: 0
  };

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

  function getRankObj(lvl) {
    return rankTitles.find(r => lvl <= r.max);
  }

  function savePlayer() {
    localStorage.setItem("zenWarriorPwaSave", JSON.stringify(player));
  }

  function loadPlayer() {
    let saved = localStorage.getItem("zenWarriorPwaSave");
    if (saved) {
      player = JSON.parse(saved);
      document.getElementById('onboarding-wizard').style.display = 'none';
      updateUI();
    } else {
      document.getElementById('onboarding-wizard').style.display = 'flex';
      document.getElementById('step-1').className = 'wizard-step active-step';
    }
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
    player.stats.str = parseInt(document.getElementById('ob-str').value) || 5;
    player.stats.spd = parseInt(document.getElementById('ob-spd').value) || 10;
    player.stats.flex = parseInt(document.getElementById('ob-flex').value) || 3;
    player.stats.end = parseFloat(document.getElementById('ob-end').value) || 1;
    
    // Calcular nivel base aproximado matemático (Escalado de 1 a 10 aprox)
    let bLvl = Math.floor((player.stats.str*0.1 + player.stats.spd*0.05 + player.stats.flex*0.3 + player.stats.end*2));
    player.level = Math.max(1, Math.min(bLvl, 15)); // Cap en lvl 15 de arranque max
    player.xp = 0;
    
    savePlayer();
    document.getElementById('onboarding-wizard').style.display = 'none';
    showNotification("Perfil de Nivel " + player.level + " Forjado.\nBienvenido al Sendero, " + player.name, "Iniciación");
    updateUI();
  }

  function updateUI() {
    document.getElementById('player-name').innerText = player.name;
    let rObj = getRankObj(player.level);
    document.getElementById('player-rank-title').innerText = rObj.title;
    document.getElementById('avatar').innerText = rObj.icon;
    document.getElementById('player-level').innerText = player.level;
    document.getElementById('player-sessions').innerText = player.workoutCount;

    document.getElementById('stat-str').innerText = player.stats.str.toFixed(1);
    document.getElementById('stat-spd').innerText = player.stats.spd.toFixed(1);
    document.getElementById('stat-flex').innerText = player.stats.flex.toFixed(1);
    document.getElementById('stat-end').innerText = player.stats.end.toFixed(1);

    let maxXP = player.level * 400;
    if(document.getElementById('xp-text-mini')) document.getElementById('xp-text-mini').innerText = `${Math.floor(player.xp)} / ${maxXP} XP`;
    let percent = Math.min((player.xp / maxXP) * 100, 100);
    document.getElementById('xp-bar').style.width = percent + '%';
  }

  function gainXP(amount, statAlias) {
    player.xp += amount;
    player.stats[statAlias] += 0.2; 
    let maxXP = player.level * 400;
    if (player.xp >= maxXP) {
      player.xp -= maxXP;
      player.level++;
      showNotification(`¡HAS ASCENDIDO AL NIVEL ${player.level}!\n${getRankObj(player.level).title}`, "🌟 EVOLUCIÓN ESPIRITUAL");
    }
    savePlayer();
    updateUI();
  }

  function showNotification(msg, title) {
    document.getElementById('noti-title').innerText = title;
    document.getElementById('noti-msg').innerText = msg;
    document.getElementById('notification-modal').style.display = 'flex';
  }

  document.getElementById('noti-close').addEventListener('click', () => {
    document.getElementById('notification-modal').style.display = 'none';
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
    if (imgUrl && imgUrl.startsWith('http')) {
      imgContainer.innerHTML = `<img src="${imgUrl}" style="width:100%; border-radius:8px; border:1px solid var(--accent-gold);">`;
    } else {
      imgContainer.innerHTML = `<div style="width:100%; height:180px; background:#111; border-radius:8px; border:1px dashed #444; display:flex; align-items:center; justify-content:center; color:#555; font-size:0.8rem; font-family:'Inter'; text-transform:uppercase; letter-spacing:1px; text-align:center; padding:10px;">[ Transmisión Visual Dañada ]</div>`;
    }
    document.getElementById('info-modal').style.display = 'flex';
  }
  document.getElementById('info-close').addEventListener('click', () => {
    document.getElementById('info-modal').style.display = 'none';
    document.getElementById('info-img-container').innerHTML = '';
  });

  window.openCodexModal = function() {
    let html = '';
    rankTitles.forEach((r, idx) => {
       let isAcquired = player.level > (idx === 0 ? 0 : rankTitles[idx-1].max);
       let isCurrent = getRankObj(player.level).title === r.title;
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
    document.getElementById('codex-modal').style.display = 'flex';
  }

  // ORÁCULO OFFLINE (MOTOR PROCEDIMENTAL)
  function generateOfflineRoutine(type = 'conditioning') {
    document.getElementById('loader').style.display = 'block';
    
    setTimeout(() => {
      // 1. Filtrar base de datos según el nivel del jugador y el tipo (domain)
      let validExercises = EXERCISE_DB.filter(ex => player.level >= ex.lvl_min && player.level <= ex.lvl_max && ex.domain === type);
      
      // Si por alguna razón no hay validos, relajar el nivel
      if(validExercises.length < 5) validExercises = EXERCISE_DB.filter(ex => ex.domain === type);
      if(validExercises.length === 0) validExercises = EXERCISE_DB; // Failsafe extremo

      // 2. Seleccionar 4 o 5 aleatorios dependiendo del tipo
      let shuffled = validExercises.sort(() => 0.5 - Math.random());
      let selected = shuffled.slice(0, type === 'mobility' ? 4 : 5);

      // 3. Escalar matemáticamente
      let routine = selected.map(ex => {
        // Fórmula de escala = baseVal + (Nivel - lvl_min) * scale
        let factor = (player.level - ex.lvl_min) * ex.scale;
        let finalVal = Math.floor(Math.max(ex.baseVal, ex.baseVal + factor));
        let numSets = type === 'mobility' ? 2 : (player.level > 20 ? 4 : 3);
        
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
      document.getElementById('loader').style.display = 'none';
      renderExercises(routine);

    }, 600); // Simulamos "Carga Neural" para efecto inmersivo
  }

  const startRoutineHandler = (type = 'conditioning') => {
    document.getElementById('home-view').className = 'hidden-view';
    document.getElementById('routine-view').className = 'active-view';
    document.getElementById('btn-finish-routine').style.display = 'none';
    document.getElementById('exercises-list').innerHTML = '';
    generateOfflineRoutine(type);
  };

  if(document.getElementById('btn-start-conditioning')) document.getElementById('btn-start-conditioning').addEventListener('click', () => startRoutineHandler('conditioning'));
  if(document.getElementById('btn-start-mobility')) document.getElementById('btn-start-mobility').addEventListener('click', () => startRoutineHandler('mobility'));

  document.getElementById('btn-cancel-routine').addEventListener('click', () => {
    document.getElementById('routine-view').className = 'hidden-view';
    document.getElementById('home-view').className = 'active-view';
  });

  document.getElementById('btn-finish-routine').addEventListener('click', () => {
    player.workoutCount++;
    savePlayer();
    document.getElementById('routine-view').className = 'hidden-view';
    document.getElementById('home-view').className = 'active-view';
    document.getElementById('exercises-list').innerHTML = '';
    showNotification("Ha sido una sesión exigente. Has forjado tu espíritu y sumado una Victoria Histórica a tu perfil.", "✅ Reposo del Guerrero");
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
    
    if(exercises && exercises.length > 0) document.getElementById('btn-finish-routine').style.display = 'none';

    exercises.forEach((ex, index) => {
      let isTime = ex.t === 'time' || ex.t === 'tiempo';
      let numericVal = parseInt(ex.val) || 0;
      let timerBtn = isTime && numericVal > 0 
        ? `<button class="btn-secondary" style="width:auto;" onclick="openTimer(${numericVal})">⏱️ Temp. ${numericVal}s</button>`
        : `<button class="btn-secondary" style="width:auto;" onclick="openTimer(60)">⏱️ Descanso 60s</button>`;
      
      let safeImg = ex.m && ex.m.startsWith('http') ? ex.m : '';
      let safeDesc = (ex.desc || "").replace(/'/g, "\\'").replace(/"/g, '&quot;');
      let safeN = (ex.n || "").replace(/'/g, "\\'").replace(/"/g, '&quot;');

      let altBtn = ex.alt ? `<button class="btn-secondary" style="border-color:var(--accent-red); color:#ff5555; width:100%; margin-top:5px; font-weight:700;" onclick="mutateExercise(${index}, '${ex.id}')">🔄 ALTERNATIVA (No tengo Equipo)</button>` : '';

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

  // TIMER
  let timerInterval;
  let timerSeconds = 0;
  let isCountdown = false;

  window.openTimer = function(seconds) {
    timerSeconds = parseInt(seconds, 10) || 0;
    isCountdown = timerSeconds > 0;
    updateTimerDisplay();
    document.getElementById('timer-modal').style.display = 'flex';
  }
  
  document.getElementById('timer-start').addEventListener('click', () => {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (isCountdown) {
        timerSeconds--;
        if (timerSeconds <= 0) {
           clearInterval(timerInterval);
           timerSeconds = 0;
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
    document.getElementById('timer-modal').style.display = 'none';
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
