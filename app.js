  let player = {
    name: "Desconocido", level: 1, xp: 0, workoutCount: 0,
    apiKey: "", 
    stats: { str: 0.0, spd: 0.0, flex: 0.0, end: 0.0 }
  };

  const rankTitles = [
    { max: 2, title: "Semilla Inactiva", icon: "🌰" },
    { max: 4, title: "Brote Despierto", icon: "🌱" },
    { max: 7, title: "Planta Joven", icon: "🌿" },
    { max: 11, title: "Forja en Maceta", icon: "🪴" },
    { max: 15, title: "Bambú Verde", icon: "🎋" },
    { max: 19, title: "Bambú Fuerte", icon: "🎍" },
    { max: 24, title: "Pino Creciente", icon: "🌲" },
    { max: 34, title: "Roble Antiguo", icon: "🌳" },
    { max: 49, title: "Montaña Inamovible", icon: "⛰️" },
    { max: 999,title: "El Dragón Ascendido", icon: "🐉" }
  ];

  const zenQuotes = [
    "No temo al hombre que ha lanzado 10,000 golpes, temo al que ha ensayado un golpe 10,000 veces.",
    "El dolor de la disciplina es menor que el dolor del arrepentimiento.",
    "Bambú que se dobla ante el viento, sobrevive al huracán.",
    "Si tu mente está vacía, siempre está lista para cualquier cosa.",
    "El río perfora la roca no por su fuerza, sino por su persistencia.",
    "Conócete a ti mismo y ganarás todas las batallas.",
    "Observa en silencio, ataca sin dudar."
  ];

  function getRankObj(level) {
    for (let r of rankTitles) if (level <= r.max) return r;
    return rankTitles[rankTitles.length - 1];
  }

  function showNotification(msg, title = "⛩️ Templo Principal") {
    document.getElementById('noti-title').innerText = title;
    document.getElementById('noti-msg').innerHTML = msg.replace(/\n/g, '<br/>');
    document.getElementById('notification-modal').style.display = 'flex';
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('maestro-quote').innerText = '"' + zenQuotes[Math.floor(Math.random() * zenQuotes.length)] + '"';
    loadPlayer();
    setupEventListeners();
  });

  function savePlayer() {
    localStorage.setItem('zen_warrior_player', JSON.stringify(player));
    updateUI();
  }

  function loadPlayer() {
    const saved = localStorage.getItem('zen_warrior_player');
    if (saved) {
      player = Object.assign(player, JSON.parse(saved));
      if(!player.workoutCount) player.workoutCount = 0;
      if(!player.apiKey) player.apiKey = "";
      document.getElementById('init-modal').style.display = 'none';
      updateUI();
    } else {
      document.getElementById('init-modal').style.display = 'flex';
    }
  }

  function updateUI() {
    document.getElementById('player-name').innerText = player.name;
    document.getElementById('player-level').innerText = player.level;
    document.getElementById('player-sessions').innerText = player.workoutCount;
    
    let rank = getRankObj(player.level);
    document.getElementById('player-rank-title').innerText = rank.title;
    document.getElementById('avatar').innerText = rank.icon;
    
    document.getElementById('stat-str').innerText = player.stats.str.toFixed(2);
    document.getElementById('stat-spd').innerText = player.stats.spd.toFixed(2);
    document.getElementById('stat-flex').innerText = player.stats.flex.toFixed(2);
    document.getElementById('stat-end').innerText = player.stats.end.toFixed(2);

    let maxXP = player.level * 400;
    document.getElementById('xp-text').innerText = `${Math.floor(player.xp)} / ${maxXP} XP`;
    let percent = Math.min((player.xp / maxXP) * 100, 100);
    document.getElementById('xp-bar').style.width = percent + '%';
  }

  function gainXP(amount, stat) {
    player.xp += amount;
    player.stats[stat] += 0.05;
    
    let maxXP = player.level * 400;
    if (player.xp >= maxXP) {
      player.level++;
      player.xp -= maxXP;
      setTimeout(() => showNotification(`¡Felicidades ${player.name}!\n\nHas evolucionado al Nivel ${player.level}.\nTu estado visual es ahora: **${getRankObj(player.level).title}**.\n\nSiente cómo tu esencia se solidifica.`, "✨ ¡Evolución de Rango!"), 400);
    }
    savePlayer();
  }

  function setupEventListeners() {
    document.getElementById('btn-start').addEventListener('click', () => {
      let initialKey = document.getElementById('init-api-key').value.trim();
      if(initialKey.length < 10) {
        showNotification("Debes introducir tu API Key de Google Studio para continuar. Es el motor de tu maestro.", "Fallo de Integración");
        return;
      }

      let name = document.getElementById('init-name').value.trim() || 'Guerrero Zen';
      player.name = name;
      player.stats.str = parseFloat(document.getElementById('init-str').value) || 0;
      player.stats.spd = parseFloat(document.getElementById('init-spd').value) || 0;
      player.stats.flex = parseFloat(document.getElementById('init-flex').value) || 0;
      player.stats.end = parseFloat(document.getElementById('init-end').value) || 0;
      player.apiKey = initialKey;

      player.xp = 0; player.level = 1; player.workoutCount = 0;
      savePlayer();
      document.getElementById('init-modal').style.display = 'none';
      showNotification("Tu Sabiduría (API Key) ha sido conectada de forma nativa a tu navegador.", "Llave Conectada");
    });

    document.getElementById('btn-start-routine').addEventListener('click', () => {
      document.getElementById('home-view').style.display = 'none';
      document.getElementById('routine-view').style.display = 'block';
      document.getElementById('btn-finish-routine').style.display = 'none';
      fetchRoutine();
    });

    document.getElementById('btn-cancel-routine').addEventListener('click', () => {
      document.getElementById('maestro-quote').innerText = '"' + zenQuotes[Math.floor(Math.random() * zenQuotes.length)] + '"';
      document.getElementById('routine-view').style.display = 'none';
      document.getElementById('home-view').style.display = 'block';
    });

    document.getElementById('btn-finish-routine').addEventListener('click', () => {
      player.workoutCount++;
      savePlayer();
      document.getElementById('maestro-quote').innerText = '"' + zenQuotes[Math.floor(Math.random() * zenQuotes.length)] + '"';
      document.getElementById('routine-view').style.display = 'none';
      document.getElementById('home-view').style.display = 'block';
      document.getElementById('exercises-list').innerHTML = '';
      showNotification("Ha sido una sesión exigente. Has forjado tu espíritu y sumado un logro a tu entrenamiento.", "✅ Reposo del Guerrero");
    });

    document.getElementById('noti-close').addEventListener('click', () => document.getElementById('notification-modal').style.display = 'none');
    document.getElementById('info-close').addEventListener('click', () => {
      document.getElementById('info-modal').style.display = 'none';
      document.getElementById('info-img-container').innerHTML = '';
    });
    
    window.openApiConfig = function() {
       document.getElementById('post-api-key').value = player.apiKey || "";
       document.getElementById('post-api-modal').style.display = 'flex';
    }
    
    window.saveSettingsAPI = function() {
       let val = document.getElementById('post-api-key').value.trim();
       if(val.length > 10) {
         player.apiKey = val;
         savePlayer();
         document.getElementById('post-api-modal').style.display = 'none';
         showNotification("API Key Personal vinculada con éxito en caché local.", "Sistema Activo");
       } else {
         showNotification("La API Key es muy corta o inválida.", "Error");
       }
    }

    document.querySelectorAll('.radio-btn[data-url]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.radio-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        let audio = document.getElementById('audio-player');
        audio.src = e.target.getAttribute('data-url');
        audio.volume = 0.6;
        audio.play().catch(console.warn);
      });
    });
    document.getElementById('radio-stop').addEventListener('click', () => {
      document.querySelectorAll('.radio-btn').forEach(b => b.classList.remove('active'));
      let audio = document.getElementById('audio-player');
      audio.pause(); audio.currentTime = 0;
    });

    document.getElementById('timer-start').addEventListener('click', () => {
      if(!timerInterval && (timerSeconds > 0 || !isCountdownTimer)) {
        timerInterval = setInterval(onTimerTick, 1000);
      }
    });
    document.getElementById('timer-stop').addEventListener('click', stopTimer);
    document.getElementById('timer-close').addEventListener('click', () => {
      stopTimer(); document.getElementById('timer-modal').style.display = 'none';
    });
  }

  function playSyntheticGong() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if(!AudioContext) return;
      const ctx = new AudioContext();
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc1.frequency.setValueAtTime(320, ctx.currentTime);
      osc2.frequency.setValueAtTime(640, ctx.currentTime);
      
      gain.gain.setValueAtTime(1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 3.0);
      
      osc1.connect(gain); osc2.connect(gain); gain.connect(ctx.destination);
      osc1.start(); osc2.start();
      osc1.stop(ctx.currentTime + 3.5); osc2.stop(ctx.currentTime + 3.5);
    } catch(e) {}
  }

  let timerInterval = null;
  let timerSeconds = 0;
  let isCountdownTimer = false;

  window.openTimer = function(initialSeconds) {
    stopTimer();
    isCountdownTimer = initialSeconds > 0;
    timerSeconds = initialSeconds || 0;
    updateTimerDisplay();
    document.getElementById('timer-modal').style.display = 'flex';
  }

  function stopTimer() {
    if(timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  }

  function onTimerTick() {
    if (isCountdownTimer) {
      timerSeconds--;
      if (timerSeconds <= 0) {
        timerSeconds = 0; stopTimer(); updateTimerDisplay();
        playSyntheticGong();
        setTimeout(() => {
            document.getElementById('timer-modal').style.display = 'none';
            showNotification("El tiempo ha concluido. Recupera tu aliento o ataca el siguiente desafío.", "⏱️ ¡Tiempo Fulminado!");
        }, 100);
        return;
      }
    } else timerSeconds++;
    updateTimerDisplay();
  }

  function updateTimerDisplay() {
    let secs = Math.max(0, timerSeconds);
    let m = Math.floor(secs / 60).toString().padStart(2, '0');
    let s = (secs % 60).toString().padStart(2, '0');
    document.getElementById('timer-display').innerText = `${m}:${s}`;
  }

  async function fetchRoutine() {
    let loader = document.getElementById('loader');
    let container = document.getElementById('exercises-list');
    
    document.getElementById('exercises-list').innerHTML = ''; 
    document.getElementById('btn-cancel-routine').style.display = 'none'; 
    document.getElementById('btn-finish-routine').style.display = 'none';
    loader.style.display = 'block';

    if(!player.apiKey || player.apiKey.length < 10) {
      showNotification("Debes introducir tu API Key de Gemini en el menú de ajustes de la PWA.", "Llave Astral Faltante");
      document.getElementById('loader').style.display = 'none';
      document.getElementById('routine-view').style.display = 'none';
      document.getElementById('home-view').style.display = 'block';
      setTimeout(() => document.getElementById('post-api-modal').style.display = 'flex', 800);
      return;
    }

    let enfoques = [
      "Fuerza de Empuje (Pecho, Hombros, Tríceps)", 
      "Tracción Marcial (Espalda y Bíceps)", 
      "Piernas Arraigadas (Cuádriceps, Femorales, Pantorrillas)", 
      "Core de Acero (Abdomen y Lumbares)", 
      "Cardio Marcial (Agilidad y Ritmo)", 
      "Movilidad y Control Articular (Flexibilidad)"
    ];
    let estilos = ["El Tigre (Poder crudo)", "La Grulla (Equilibrio)", "El Mono (Agilidad baja)", "El Dragón (Dominio del núcleo)", "La Mantis (Isometría)"];
    
    let todayFocus = enfoques[Math.floor(Math.random() * enfoques.length)];
    let todayStyle = estilos[Math.floor(Math.random() * estilos.length)];

    let antiRepetitiveToken = Math.floor(Math.random() * 9999999);
    let prompt = "Eres un Maestro Zen de Calistenia diseñando rutinas PERSONALIZADAS e IMPREDECIBLES. " +
    "[CRÍTICO - TOKEN DE VARIACIÓN: " + antiRepetitiveToken + "] ESTA ES UNA SESIÓN TOTALMENTE NUEVA QUE NO DEBE PARECERSE A LA ANTERIOR. " +
    "REGLA DE VARIEDAD ABSOLUTA: Tienes ESTRICTAMENTE PROHIBIDO dar ejercicios con nombres tradicionales (NO uses la palabra 'Flexiones', 'Sentadillas', 'Planchas', 'Burpees'). DEBES inventar 5 ejercicios ÚNICOS y llamarlos con nombres de " + todayStyle + " (Ej: 'Golpe de Raíz', 'Equilibrio de Bambú'). Hoy el biomeotipo es OBLIGATORIAMENTE: " + todayFocus + ". " +
    "REGLA DE DIFICULTAD: Tu alumno es Nivel " + player.level + " y lleva " + player.workoutCount + " sesiones. Si el nivel es menor a 5, los ejercicios deben ser biomecánicamente muy gentiles y fáciles (ej. apoyando rodillas, isometría corta), pero SIEMPRE descritos y camuflados bajo nombres épicos de " + todayStyle + ". " +
    "DEVUELVE EL RESULTADO EXCLUSIVAMENTE EN JSON PURO. NO AÑADAS LA ETIQUETA ```json NI MARKDOWN. SÓLO LAS LLAVES: \n" +
    "{\"quote\": \"Frase poética y estoica marcial (inédita y profunda)\", \"exercises\": [{" +
    "\"n\": \"Nombre del Ejercicio Temático\"," +
    "\"r\": \"ej: 12 reps, o 60s\"," +
    "\"t\": \"reps\" o \"time\"," +
    "\"val\": número entero de reps o segs," +
    "\"s\": \"str, spd, flex o end\"," +
    "\"sets\": 3," +
    "\"desc\": \"Coaching técnico y respiratorio\"," +
    "\"m\": \"URL HTTPS real de un visual o dejar string vacío\"}]}";

    let url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=' + player.apiKey.trim();
    let payload = {
      "contents": [{"parts": [{"text": prompt}]}],
      "generationConfig": { "responseMimeType": "application/json", "temperature": 1.2, "topP": 0.95 }
    };

    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!resp.ok) {
        if (resp.status === 400) throw new Error("Clave_Invalida");
        if (resp.status === 429) throw new Error("Quota");
        if (resp.status >= 500) throw new Error("Server_Down");
        let txt = await resp.text();
        throw new Error("HTTP " + resp.status + " " + txt);
      }

      const jsonResp = await resp.json();
      if(jsonResp.candidates && jsonResp.candidates[0] && jsonResp.candidates[0].content) {
        let textResult = jsonResp.candidates[0].content.parts[0].text.replace(/```json/gi, "").replace(/```/g, "").trim();
        processRoutine(textResult);
      } else {
        throw new Error("Formato json dañado de Gemini.");
      }
    } catch (e) {
       loader.style.display = 'none';       
       if(e.message === "Clave_Invalida") {
         document.getElementById('routine-view').style.display = 'none';
         document.getElementById('home-view').style.display = 'block';
         showNotification("La API Key es Inválida o no está activada para la v1beta.", "Rechazo del Oráculo");
       } else if (e.message === "Quota") {
         document.getElementById('routine-view').style.display = 'none';
         document.getElementById('home-view').style.display = 'block';
         showNotification("⛩️ Demasiada energía liberada. Has superado el límite gratuito de Google (15 rutinas/minuto). Respira 60 segundos.", "Límite Excedido");
       } else {
         document.getElementById('home-view').style.display = 'none';
         document.getElementById('routine-view').style.display = 'block';
         showNotification("Corte en el plano astral. Se ha activado la rutina de emergencia offline.", "Ataque Sorpresa");
         handleEmergencyRoutine();
       }
    }
  }

  function processRoutine(jsonString) {
    try {
      let data = JSON.parse(jsonString);
      if (data.error) { throw new Error(data.error); }
      if (data.quote) document.getElementById('maestro-quote').innerText = '"' + data.quote + '"';
      renderExercises(data.exercises);
    } catch(e) {
      handleEmergencyRoutine();
    }
  }

  function handleEmergencyRoutine() {
    let fallback = [
        { n: "Flexiones del Tigre Herido", t: "reps", val: 12, r: "12 reps", s: "str", sets: 3, desc: "Si fallas aquí, apoya tus rodillas. Controla la bajada.", m: "" },
        { n: "Salto del Mono Blanco", t: "reps", val: 15, r: "15 reps", s: "spd", sets: 3, desc: "Llega al suelo, explota hacia el cielo (Burpees moderados).", m: "" },
        { n: "Raíz del Bambú", t: "time", val: 45, r: "45 seg", s: "flex", sets: 3, desc: "Sostén el balance sobre una pierna como un tronco inquebrantable.", m: "" },
        { n: "Núcleo de Hierro", t: "time", val: 60, r: "60 seg", s: "end", sets: 3, desc: "Plancha perfecta. Como el acero, mantén tu espalda paralela.", m: "" }
    ];
    renderExercises(fallback);
  }

  function renderExercises(exercises) {
    document.getElementById('loader').style.display = 'none';
    document.getElementById('btn-cancel-routine').style.display = 'block'; 
    let container = document.getElementById('exercises-list');
    container.innerHTML = '';
    
    if(exercises && exercises.length > 0) document.getElementById('btn-finish-routine').style.display = 'block';

    exercises.forEach((ex, index) => {
      let isTime = ex.t === 'time' || ex.t === 'tiempo';
      let numericVal = parseInt(ex.val) || 0;
      let timerBtn = isTime && numericVal > 0 
        ? `<button class="btn-secondary" style="width:auto;" onclick="openTimer(${numericVal})">⏱️ Temp. ${numericVal}s</button>`
        : `<button class="btn-secondary" style="width:auto;" onclick="openTimer(0)">⏱️ Cronómetro</button>`;
      
      let safeImg = ex.m && ex.m.startsWith('http') ? ex.m : '';
      let safeDesc = (ex.desc || "").replace(/'/g, "\\'").replace(/"/g, '&quot;');
      let safeN = (ex.n || "").replace(/'/g, "\\'").replace(/"/g, '&quot;');

      let cardHtml = `
        <div class="exercise-card" id="ex-${index}">
          <div class="exercise-header">
            <span>${ex.n}</span>
            <span class="exercise-stat-badge">${(ex.s || 'str').toUpperCase()}</span>
          </div>
          <div style="font-size: 0.9rem; margin-bottom: 5px; color: #444;">
           <strong>${ex.sets} SERIES ✕ ${ex.r.toUpperCase()}</strong>
          </div>
          <div style="display: flex; gap: 8px; margin-top: 10px; width: 100%;">
           <button class="btn-complete" onclick="completeTask(${index}, '${ex.s || 'str'}', '${safeN}')">Forjado (+20 XP)</button>
          </div>
          <div style="display: flex; gap: 8px; margin-top: 5px; width: 100%;">
            <button class="btn-secondary" style="width:50%;" onclick="openInfoModal('${safeN}', '${safeDesc}', '${safeImg}')">👁️ Detalles</button>
            ${timerBtn}
          </div>
        </div>
      `;
      container.innerHTML += cardHtml;
    });
  }

  window.openInfoModal = function(title, desc, imgUrl) {
    document.getElementById('info-title').innerText = title;
    document.getElementById('info-desc').innerText = `"${desc}"`;
    let container = document.getElementById('info-img-container');
    if (imgUrl && imgUrl.startsWith('http')) {
      container.innerHTML = `<img src="${imgUrl}" style="width:100%; max-height: 200px; object-fit: cover; border-radius: 8px;">`;
    } else {
      container.innerHTML = `<div style="padding: 20px; text-align:center; background:#111; border-radius:8px; color:#555; border: 1px dashed #333;">Fomenta la conexión mente-músculo guiándote únicamente por las palabras.</div>`;
    }
    document.getElementById('info-modal').style.display = 'flex';
  }

  window.completeTask = function(index, statAlias, exName) {
    let s = "str";
    if (statAlias.toLowerCase().includes("spd")) s = "spd";
    if (statAlias.toLowerCase().includes("flex")) s = "flex";
    if (statAlias.toLowerCase().includes("end")) s = "end";
    
    gainXP(20, s); 
    
    let card = document.getElementById(`ex-${index}`);
    if(card) {
      card.style.opacity = '0.5'; card.style.borderColor = 'var(--accent-green)';
      let btn = card.querySelector('.btn-complete');
      if(btn) { btn.innerText = "¡Disciplina Forjada!"; btn.disabled = true; }
    }
    showNotification(`Has forjado tu nivel con éxito: +20 XP. El dolor es debilidad abandonando el cuerpo.`, "🥊 Esfuerzo Honrado");
  }
