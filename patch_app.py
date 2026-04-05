import re

with open('app.js', 'r') as f:
    code = f.read()

# 1. Update player initial structure
old_player = """  let player = {
    name: "",
    level: 1,
    xp: 0,
    stats: { str: 0, spd: 0, flex: 0, end: 0 },
    workoutCount: 0
  };"""
new_player = """  let player = {
    name: "",
    rankIndex: 0,
    stats: {
      str: { lvl: 1, xp: 0 },
      spd: { lvl: 1, xp: 0 },
      flex: { lvl: 1, xp: 0 },
      end: { lvl: 1, xp: 0 }
    },
    workoutCount: 0
  };"""
code = code.replace(old_player, new_player)

# 2. Update getRankObj to getCurrentRank
old_getrank = """  function getRankObj(lvl) {
    return rankTitles.find(r => lvl <= r.max) || rankTitles[rankTitles.length - 1];
  }"""
new_getrank = """  function getCurrentRank() {
    return rankTitles[player.rankIndex] || rankTitles[rankTitles.length - 1];
  }"""
code = code.replace(old_getrank, new_getrank)

# 3. Update loadPlayer
old_loadplayer = """    if (saved) {
      player = Object.assign(player, JSON.parse(saved));
      if (typeof player.workoutCount === 'undefined') player.workoutCount = 0;
      document.getElementById('onboarding-wizard').style.display = 'none';
      updateUI();
    }"""
new_loadplayer = """    if (saved) {
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
      document.getElementById('onboarding-wizard').style.display = 'none';
      updateUI();
    }"""
code = code.replace(old_loadplayer, new_loadplayer)

# 4. Update finishWizard
old_finish = """  window.finishWizard = function() {
    let endVal = document.getElementById('ob-end').value;
    if(endVal.trim() === '') {
      showNotification("No escapes del ejercicio final.", "Aviso");
      return;
    }

    player.name = document.getElementById('ob-name').value;
    let vStr = parseInt(document.getElementById('ob-str').value);
    let vSpd = parseInt(document.getElementById('ob-spd').value);
    let vFlex = parseInt(document.getElementById('ob-flex').value);
    let vEnd = parseFloat(document.getElementById('ob-end').value);

    player.stats.str = isNaN(vStr) ? 5 : vStr;
    player.stats.spd = isNaN(vSpd) ? 10 : vSpd;
    player.stats.flex = isNaN(vFlex) ? 3 : vFlex;
    player.stats.end = isNaN(vEnd) ? 1 : vEnd;
    
    // Calcular nivel base aproximado matemático (Escalado de 1 a 10 aprox)
    let bLvl = Math.floor((player.stats.str*0.1 + player.stats.spd*0.05 + player.stats.flex*0.3 + player.stats.end*2));
    player.level = Math.max(1, Math.min(bLvl, 15)); // Cap en lvl 15 de arranque max
    player.xp = 0;
    
    savePlayer();
    document.getElementById('onboarding-wizard').style.display = 'none';
    showNotification("Perfil de Nivel " + player.level + " Forjado.\\nBienvenido al Sendero, " + player.name, "Iniciación");
    updateUI();
  }"""
new_finish = """  window.finishWizard = function() {
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

    let lvlStr = Math.max(1, Math.min(15, Math.floor(vStr / 4) + 1));
    let lvlSpd = Math.max(1, Math.min(15, Math.floor(vSpd / 6) + 1));
    let lvlFlex = Math.max(1, Math.min(10, vFlex));
    let lvlEnd = Math.max(1, Math.min(15, Math.floor(vEnd * 2) + 1));

    let maxInitLvl = Math.max(lvlStr, lvlSpd, lvlFlex, lvlEnd);
    let startIdx = rankTitles.findIndex(r => maxInitLvl <= r.max);
    player.rankIndex = startIdx === -1 ? 0 : startIdx;
    
    let allowedCap = rankTitles[player.rankIndex].max;
    player.stats = {
      str: { lvl: Math.min(lvlStr, allowedCap), xp: 0 },
      spd: { lvl: Math.min(lvlSpd, allowedCap), xp: 0 },
      flex: { lvl: Math.min(lvlFlex, allowedCap), xp: 0 },
      end: { lvl: Math.min(lvlEnd, allowedCap), xp: 0 }
    };
    
    player.workoutCount = 0;
    
    savePlayer();
    document.getElementById('onboarding-wizard').style.display = 'none';
    showNotification("Perfil Forjado con Especializaciones.\\nBienvenido al Sendero, " + player.name, "Iniciación");
    updateUI();
  }"""
code = code.replace(old_finish, new_finish)

# 5. Update checkExamPending
old_checkexam = """  function checkExamPending() {
    let rObj = getRankObj(player.level);
    return player.level === rObj.max && player.xp >= player.level * 400;
  }"""
new_checkexam = """  function checkExamPending() {
    let cap = getCurrentRank().max;
    return player.stats.str.lvl >= cap && player.stats.spd.lvl >= cap && player.stats.flex.lvl >= cap && player.stats.end.lvl >= cap;
  }"""
code = code.replace(old_checkexam, new_checkexam)

# 6. Update updateUI
old_updateui = """  function updateUI() {
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
      if(document.getElementById('xp-text-mini')) document.getElementById('xp-text-mini').innerText = `${Math.floor(player.xp)} / ${maxXP} XP`;
      let percent = Math.min((player.xp / maxXP) * 100, 100);
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
  }"""
new_updateui = """  function updateUI() {
    document.getElementById('player-name').innerText = player.name;
    let rObj = getCurrentRank();
    document.getElementById('player-rank-title').innerText = rObj.title;
    document.getElementById('avatar').innerText = rObj.icon;
    
    let minLvl = Math.min(player.stats.str.lvl, player.stats.spd.lvl, player.stats.flex.lvl, player.stats.end.lvl);
    document.getElementById('player-level').innerText = minLvl;
    document.getElementById('player-sessions').innerText = player.workoutCount;

    document.getElementById('stat-str').innerText = "Lvl " + player.stats.str.lvl;
    document.getElementById('stat-spd').innerText = "Lvl " + player.stats.spd.lvl;
    document.getElementById('stat-flex').innerText = "Lvl " + player.stats.flex.lvl;
    document.getElementById('stat-end').innerText = "Lvl " + player.stats.end.lvl;

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
  }"""
code = code.replace(old_updateui, new_updateui)

# 7. Update gainXP
old_gainxp = """  function gainXP(amount, statAlias) {
    if (checkExamPending()) return; // No acumula XP extra mientras espera el examen
    
    player.xp += amount;
    player.stats[statAlias] += 0.2; 
    let maxXP = player.level * 400;
    
    let rObj = getRankObj(player.level);
    if (player.xp >= maxXP) {
      if (player.level === rObj.max) {
        player.xp = maxXP; 
        showNotification("Estás bloqueado en la cúspide de tu rango. Es hora de demostrar si eres digno del siguiente paso en el escalafón. Tu próxima Misión de Acondicionamiento será un EXAMEN DE ASCENSO.", "Examen Máximo Disponible");
      } else {
        player.xp -= maxXP;
        player.level++;
        showNotification(`¡HAS ASCENDIDO AL NIVEL ${player.level}!\\n${getRankObj(player.level).title}`, "🌟 EVOLUCIÓN ESPIRITUAL");
      }
    }
    savePlayer();
    updateUI();
  }"""
new_gainxp = """  function gainXP(amount, statAlias) {
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
  }"""
code = code.replace(old_gainxp, new_gainxp)

# 8. Update Codex Modal rank index
old_codex = """    rankTitles.forEach((r, idx) => {
       let isAcquired = player.level > (idx === 0 ? 0 : rankTitles[idx-1].max);
       let isCurrent = getRankObj(player.level).title === r.title;"""
new_codex = """    rankTitles.forEach((r, idx) => {
       let isAcquired = player.rankIndex >= idx;
       let isCurrent = player.rankIndex === idx;"""
code = code.replace(old_codex, new_codex)

# 9. Update Library Modal
old_library = """    EXERCISE_DB.forEach(ex => {
        let isLocked = ex.lvl_min > player.level;
        let displayName = isLocked ? "??? (Técnica Bloqueada)" : ex.n + " - " + ex.real;
        let displayDesc = isLocked ? `Requiere Nivel ${ex.lvl_min} para desbloquear.` : ex.desc;"""
new_library = """    EXERCISE_DB.forEach(ex => {
        let pLvl = player.stats[ex.s]?.lvl || 1;
        let isLocked = ex.lvl_min > pLvl;
        let displayName = isLocked ? "??? (Técnica Bloqueada)" : ex.n + " - " + ex.real;
        let displayDesc = isLocked ? `Requiere Nivel ${ex.lvl_min} físico de ${ex.s.toUpperCase()} para desbloquear.` : ex.desc;"""
code = code.replace(old_library, new_library)

# 10. Update generateOfflineRoutine
old_generate = """      // 1. Filtrar base de datos según el nivel del jugador y el tipo (domain)
      let validExercises = EXERCISE_DB.filter(ex => player.level >= ex.lvl_min && player.level <= ex.lvl_max && ex.domain === type);"""
new_generate = """      // 1. Filtrar base de datos según nivel individual y el tipo (domain)
      let validExercises = EXERCISE_DB.filter(ex => {
         let pLvl = player.stats[ex.s]?.lvl || 1;
         let topLimit = window.isExamRoutine ? ex.lvl_max + 10 : ex.lvl_max;
         return pLvl >= ex.lvl_min && pLvl <= topLimit && ex.domain === type;
      });"""
code = code.replace(old_generate, new_generate)

# 11. Update generation virtualLevel
old_virtual = """      let routine = selected.map(ex => {
        let isExam = window.isExamRoutine;
        let virtualLevel = isExam ? ex.lvl_max : player.level;"""
new_virtual = """      let routine = selected.map(ex => {
        let isExam = window.isExamRoutine;
        let pLvl = player.stats[ex.s]?.lvl || 1;
        let virtualLevel = isExam ? ex.lvl_max : pLvl;"""
code = code.replace(old_virtual, new_virtual)

# 12. Update btn-cancel-routine penalty
old_cancel = """  document.getElementById('btn-cancel-routine').addEventListener('click', () => {
    if(window.isExamRoutine) {
       player.xp = Math.max(0, player.level * 400 - 200);
       savePlayer();
       updateUI();
       showNotification("Un guerrero conoce sus límites. Te has retirado del Examen de Ascenso. Has perdido experiencia, pero mañana regresarás más fuerte.", "Retorno a las Sombras");
    }"""
new_cancel = """  document.getElementById('btn-cancel-routine').addEventListener('click', () => {
    if(window.isExamRoutine) {
       let cap = getCurrentRank().max;
       ['str','spd','flex','end'].forEach(s => {
          player.stats[s].lvl = Math.max(1, cap - 1);
          player.stats[s].xp = (cap - 1) * 80;
       });
       savePlayer();
       updateUI();
       showNotification("Un guerrero conoce sus límites. Te has retirado del Examen de Ascenso. Has retrocedido en tu maestría para forjarte de nuevo.", "Retorno a las Sombras");
    }"""
code = code.replace(old_cancel, new_cancel)

# 13. Update btn-finish-routine
old_finish_routine = """  document.getElementById('btn-finish-routine').addEventListener('click', () => {
    if(window.isExamRoutine) {
       player.xp = 0; 
       player.level++; 
       initAudio();
       playFanfare();
       throwConfetti();
       showNotification(`¡HAS TRASCENDIDO TUS LÍMITES!\\n\\nAscendiendo al Nivel ${player.level}\\nHas alcanzado el Rango: ${getRankObj(player.level).title}`, "Evolución Marcial Completada");
    } else {"""
new_finish_routine = """  document.getElementById('btn-finish-routine').addEventListener('click', () => {
    if(window.isExamRoutine) {
       player.rankIndex++; 
       ['str','spd','flex','end'].forEach(s => { player.stats[s].xp = 0; });
       initAudio();
       playFanfare();
       throwConfetti();
       showNotification(`¡HAS TRASCENDIDO TUS LÍMITES!\\n\\nAscendiendo en maestría.\\nHas alcanzado el Rango: ${getCurrentRank().title}`, "Evolución Marcial Completada");
    } else {"""
code = code.replace(old_finish_routine, new_finish_routine)

with open('app.js', 'w') as f:
    f.write(code)

print("Patching successful.")
