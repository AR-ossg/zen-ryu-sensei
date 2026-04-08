import sys

file_path = "/Users/alex/Zen Ryu Sensei/app.js"
with open(file_path, "r") as f:
    content = f.read()

# REPLACEMENT 1: Generate Routine end logic
old_1 = """      currentRoutine = routine; // Se guarda en variable global para mutaciones
      closeModal('loader');
      renderExercises(routine);

    }, 120); // Brief pause for visual feedback
  }

  const startRoutineHandler = (type = 'conditioning') => {"""
new_1 = """      currentRoutine = routine; // Se guarda en variable global para mutaciones
      closeModal('loader');
      renderOverview(routine);

    }, 120); // Brief pause for visual feedback
  }

  const startRoutineHandler = (type = 'conditioning') => {"""

content = content.replace(old_1, new_1)

# REPLACEMENT 2: View switching and buttons
old_2 = """  function initRoutineGeneration(type) {
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

  document.getElementById('btn-finish-routine').addEventListener('click', () => {"""

new_2 = """  function initRoutineGeneration(type) {
    switchView('routine-overview-view', 'home-view');
    document.getElementById('overview-content').style.display = 'none';
    generateOfflineRoutine(type);
  }

  if(document.getElementById('btn-start-conditioning')) document.getElementById('btn-start-conditioning').addEventListener('click', () => startRoutineHandler('conditioning'));
  if(document.getElementById('btn-start-mobility')) document.getElementById('btn-start-mobility').addEventListener('click', () => startRoutineHandler('mobility'));

  function penalizeRankExit() {
     let cap = getCurrentRank().max;
     ['str','spd','flex','end'].forEach(s => {
        player.stats[s].lvl = Math.max(1, cap - 1);
        player.stats[s].xp = (cap - 1) * 80;
     });
     savePlayer();
     updateUI();
     showNotification("Un guerrero conoce sus límites. Te has retirado del Examen de Ascenso. Has retrocedido en tu maestría para forjarte de nuevo.", "Retorno a las Sombras");
  }

  document.getElementById('btn-cancel-overview').addEventListener('click', () => {
    if(window.isExamRoutine) penalizeRankExit();
    switchView('home-view', 'routine-overview-view');
  });

  document.getElementById('btn-cancel-focus').addEventListener('click', () => {
    if(window.isExamRoutine) penalizeRankExit();
    switchView('home-view', 'routine-focus-view');
  });
  
  document.getElementById('btn-reforge-routine').addEventListener('click', () => {
    let currentType = currentRoutine[0]?.domain || 'conditioning';
    document.getElementById('overview-content').style.display = 'none';
    generateOfflineRoutine(currentType);
  });
  
  document.getElementById('btn-start-focus').addEventListener('click', () => {
     switchView('routine-focus-view', 'routine-overview-view');
     document.getElementById('btn-cancel-focus').style.display = 'block';
     renderFocusExercises(currentRoutine);
  });

  document.getElementById('btn-finish-routine').addEventListener('click', () => {"""

content = content.replace(old_2, new_2)

# REPLACEMENT 3: After btn finish routine logic
old_3 = """    switchView('home-view', 'routine-view');
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
    const container = document.getElementById('exercises-list');

    if (exercises && exercises.length > 0) closeModal('btn-finish-routine');

    // Acumula todo en UN string → asigna innerHTML una sola vez → 1 reflow total
    let fullHtml = '';
    exercises.forEach((ex, index) => {
      const isTime    = ex.t === 'time' || ex.t === 'tiempo';
      const numericVal = parseInt(ex.val) || 0;
      const timerBtn  = isTime && numericVal > 0
        ? `<button class="btn-secondary" style="width:auto;" onclick="openTimer(${numericVal})">⏱️ Temp. ${numericVal}s</button>`
        : `<button class="btn-secondary" style="width:auto;" onclick="openTimer(60)">⏱️ Descanso 60s</button>`;

      const safeImg  = ex.m && (ex.m.startsWith('http') || ex.m.startsWith('./')) ? ex.m : '';
      const safeDesc = (ex.desc || '').replace(/'/g, "\\\\'").replace(/"/g, '&quot;');
      const safeN    = (ex.n    || '').replace(/'/g, "\\\\'").replace(/"/g, '&quot;');
      const altBtn   = (ex.alt && !window.isExamRoutine)
        ? `<button class="btn-secondary" style="border-color:var(--accent-red); color:#ff5555; width:100%; margin-top:5px; font-weight:700;" onclick="mutateExercise(${index}, '${ex.id}')">🔄 TÉCNICA ALTERNATIVA (Regresión / Adaptación)</button>`
        : '';

      // XP escala con la dificultad del ejercicio (lvl_min) y las series exigidas
      const baseLvl  = ex.lvl_min || 1;
      const baseXP   = Math.round(Math.max(20, baseLvl * 1.5 + ex.sets * 2));
      const xpReward = window.isExamRoutine ? Math.round(baseXP * 1.5) : baseXP;

      fullHtml += `
        <div class="exercise-card" id="ex-${index}">
          <div class="exercise-header">
            <span>${ex.n}</span>
            <span class="exercise-stat-badge">${(ex.s || 'str').toUpperCase()}</span>
          </div>
          <div style="font-size:0.9rem; margin-bottom:5px; color:#444;">
            <strong>${ex.sets} SERIES ✕ ${ex.r.toUpperCase()}</strong>
          </div>
          <div style="display:flex; gap:8px; margin-top:15px; width:100%;">
            <button class="btn-complete-massive" onclick="completeTask(${index}, '${ex.s || 'str'}', ${xpReward})">✔️ FORJAR (+${xpReward} XP)</button>
          </div>
          ${altBtn}
          <div style="display:flex; gap:8px; margin-top:5px; width:100%;">
            <button class="btn-secondary" style="width:50%;" onclick="openInfoModal('${safeN}', '${safeDesc}', '${safeImg}')">👁️ Técnica</button>
            ${timerBtn}
          </div>
        </div>`;
    });

    container.innerHTML = fullHtml; // único reflow
  }

  window.checkAllTasksCompleted = function() {
    let cards = document.querySelectorAll('.exercise-card');
    let completed = document.querySelectorAll('.exercise-card .btn-complete-massive:disabled');
    if(cards.length > 0 && cards.length === completed.length) {
      let finBtn = document.getElementById('btn-finish-routine');
      finBtn.style.display = 'block';
      finBtn.classList.add('pulse-glow');
      finBtn.innerText = "🏆 FINALIZAR ENTRENAMIENTO";
      setTimeout(() => finBtn.scrollIntoView({behavior: 'smooth', block: 'end'}), 150);
    }
  }

  window.completeTask = function(index, statAlias, xpReward) {
    if(navigator.vibrate) navigator.vibrate(50);
    let s = "str";
    if (statAlias.toLowerCase().includes("spd")) s = "spd";
    if (statAlias.toLowerCase().includes("flex")) s = "flex";
    if (statAlias.toLowerCase().includes("end")) s = "end";

    // Si por alguna razón no se pasó el valor (ej: versión vieja en caché), usar 20
    const xp = (typeof xpReward === 'number' && xpReward > 0) ? xpReward : 20;

    gainXP(xp, s);

    let card = document.getElementById(`ex-${index}`);
    if(card) {
      card.style.opacity = '0.7';
      card.style.borderColor = 'var(--accent-green)';
      let btn = card.querySelector('.btn-complete-massive');
      if(btn) {
        btn.innerHTML = `✅ DISCIPLINA FORJADA (+${xp} XP)`;
        btn.disabled = true;
        btn.style.boxShadow = 'none';
        btn.style.background = 'rgba(40,167,69,0.15)';
      }
    }
    showNotification(`Tu disciplina ha forjado +${xp} XP en ${s.toUpperCase()}.\n\nEl dolor es debilidad abandonando el cuerpo.`, "🥊 Esfuerzo Honrado");
    checkAllTasksCompleted();
  }"""

new_3 = """    switchView('home-view', 'routine-focus-view');
    updateUI();
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
        if(ex.t === 'time' || ex.t === 'tiempo') { exTime = parseInt(ex.val); } 
        else { exTime = (parseInt(ex.val) * 3); } 
        
        totalSecs += sets * exTime;
        totalSecs += (sets - 1) * 60; 
        
        html += `<div style="display:flex; justify-content:space-between; margin-bottom:8px; border-bottom:1px solid #222; padding-bottom:8px;">
           <span style="color:#ccc;">${ex.n}</span>
           <span style="color:var(--accent-gold); font-family:monospace;">${sets}x${ex.r.toUpperCase()}</span>
        </div>`;
     });
     
     totalSecs += exercises.length * 60; // transiciones y preparacion
     let estMins = Math.ceil(totalSecs / 60);
     document.getElementById('ov-time').innerText = estMins + 'm';
     document.getElementById('ov-count').innerText = exercises.length;
     
     let predominant = Object.keys(focusObj).reduce((a, b) => focusObj[a] > focusObj[b] ? a : b);
     let names = {str: 'FUERZA', spd: 'VELOC.', end: 'RESIST.', flex: 'FLEX.'};
     document.getElementById('ov-focus').innerText = names[predominant] || 'MIXTO';
     
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
      const isTime    = ex.t === 'time' || ex.t === 'tiempo';
      const numericVal = parseInt(ex.val) || 0;
      
      let timerBtn = '';
      if(isTime && numericVal > 0) {
         timerBtn = `<div style="display:flex; gap:8px;">
            <button class="btn-secondary" style="border-color:var(--accent-gold); color:var(--accent-gold); width:50%;" onclick="openTimer(${numericVal})">⏱️ ACTIVO</button>
            <button class="btn-secondary" style="border-color:#555; width:50%;" onclick="openTimer(60)">⏱️ DESC</button>
         </div>`;
      } else {
         timerBtn = `<button class="btn-secondary" style="width:100%; border-color:#555;" onclick="openTimer(60)">⏱️ DESCANSO 60s</button>`;
      }

      const safeImg  = ex.m && (ex.m.startsWith('http') || ex.m.startsWith('./')) ? ex.m : '';
      const safeDesc = (ex.desc || '').replace(/'/g, "\\\\'").replace(/"/g, '&quot;');
      const safeN    = (ex.n    || '').replace(/'/g, "\\\\'").replace(/"/g, '&quot;');
      const altBtn   = (ex.alt && !window.isExamRoutine)
        ? `<button class="btn-secondary" style="border-color:var(--accent-red); color:#ff5555; width:100%; margin-top:8px; font-weight:700;" onclick="mutateExercise(${index}, '${ex.id}')">🔄 TÉCNICA ALTERNATIVA</button>`
        : '';

      const baseLvl  = ex.lvl_min || 1;
      const baseXP   = Math.round(Math.max(20, baseLvl * 1.5 + ex.sets * 2));
      const xpReward = window.isExamRoutine ? Math.round(baseXP * 1.5) : baseXP;

      let statNames = {str:'FUERZA', spd:'VELOCIDAD', end:'AGUANTE', flex:'FLEX'};

      fullHtml += `
        <div class="exercise-card focus-card" id="ex-${index}" style="position:absolute; width:100%; height:100%; left:0; top:0; background:none; border:none; box-shadow:none; padding:10px; opacity: ${index === 0 ? 1 : 0}; pointer-events: ${index === 0 ? 'all' : 'none'}; transform: ${index === 0 ? 'translateX(0)' : 'translateX(50px)'}; transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.4s ease; display:flex; flex-direction:column; align-items:center; text-align:center; box-sizing:border-box;">
          
          <img src="${safeImg}" style="max-height: 25vh; width:100%; object-fit:cover; border-radius:12px; margin-bottom:15px; border:1px solid #333;" onerror="this.style.display='none';">

          <div style="font-size:1.5rem; color:var(--accent-gold); font-family:'Cinzel'; margin-bottom:5px; text-shadow:0 0 10px rgba(255,215,0,0.3);">${ex.n}</div>
          <div style="background:#111; color:var(--accent-gold); padding:4px 10px; border-radius:4px; font-size:0.75rem; font-family:'Inter'; letter-spacing:1px; margin-bottom:15px; border:1px solid #333;">${statNames[ex.s || 'str']}</div>
          
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
     if(el) el.innerText = `EJERCICIO ${currentFocusIndex + 1} DE ${currentRoutine.length}`;
  }

  window.completeFocusTask = function(index, statAlias, xpReward) {
    if(navigator.vibrate) navigator.vibrate(50);
    let s = "str";
    if (statAlias.toLowerCase().includes("spd")) s = "spd";
    if (statAlias.toLowerCase().includes("flex")) s = "flex";
    if (statAlias.toLowerCase().includes("end")) s = "end";

    const xp = (typeof xpReward === 'number' && xpReward > 0) ? xpReward : 20;
    gainXP(xp, s);
    showNotification(`Tu disciplina ha forjado +${xp} XP en ${s.toUpperCase()}.\n\nEl dolor es debilidad abandonando el cuerpo.`, "🥊 Esfuerzo Honrado");

    let currentCard = document.getElementById(`ex-${index}`);
    if(currentCard) {
       currentCard.style.opacity = '0';
       currentCard.style.transform = 'translateX(-50px)';
       currentCard.style.pointerEvents = 'none';
    }
    
    currentFocusIndex++;
    
    if(currentFocusIndex < currentRoutine.length) {
       let nextCard = document.getElementById(`ex-${currentFocusIndex}`);
       if(nextCard) {
          nextCard.style.opacity = '1';
          nextCard.style.transform = 'translateX(0)';
          nextCard.style.pointerEvents = 'all';
       }
       updateFocusProgress();
    } else {
       document.getElementById('focus-progress-text').innerText = "RUTINA COMPLETADA";
       document.getElementById('btn-cancel-focus').style.display = 'none';
       let finContainer = document.getElementById('focus-finish-container');
       finContainer.style.display = 'block';
       finContainer.classList.add('pulse-glow');
    }
  }

  window.mutateExercise = function(index, baseId) {
    let exObj = EXERCISE_DB.find(x => x.id === baseId);
    if(exObj && exObj.alt) {
       let current = currentRoutine[index];
       current.n = `${exObj.alt.n} (${exObj.alt.real})`;
       current.desc = exObj.alt.desc;
       current.m = exObj.alt.m || ""; 
       current.alt = null; // ya fue mutado
       renderFocusExercises(currentRoutine); // re-render
       
       for(let i=0; i<currentRoutine.length; i++) {
           let c = document.getElementById(`ex-${i}`);
           if(c) {
               if(i === currentFocusIndex) {
                   c.style.opacity = '1'; c.style.transform = 'translateX(0)'; c.style.pointerEvents = 'all';
               } else {
                   c.style.opacity = '0'; c.style.transform = 'translateX(50px)'; c.style.pointerEvents = 'none';
               }
           }
       }
       showNotification("El Oráculo ha adaptado la técnica a tus circunstancias.", "Mutación Física");
    }
  }"""

content = content.replace(old_3, new_3)

with open(file_path, "w") as f:
    f.write(content)

print("Patch applied successfully.")
