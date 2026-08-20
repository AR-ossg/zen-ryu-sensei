// js/routine-engine.js
// ─────────────────────────────────────────────────────────────────────────
// Módulo del MOTOR DE RUTINAS — Zen Ryu Sensei
//
// El corazón del "Oráculo": generación de rutinas (check-in, ACWR, balance
// push/pull, periodización), ejecución de la sesión activa (series,
// descanso adaptativo, mutación de ejercicios) y cierre de sesión (XP,
// monedas, racha, ascenso de rango).
//
// Extraído de app.js sin cambiar su lógica — mismo comportamiento, solo
// separado. Variables de estado que antes vivían sueltas en app.js
// (currentRoutine, activeSetIndex, restInterval, restSecondsLeft,
// nextExAnnounceTimeout) ahora son locales de este módulo, porque tras
// auditar el archivo completo se confirmó que NINGÚN código fuera de este
// clúster las usaba.
//
// workoutHistory es la única excepción: sigue viviendo en app.js (porque
// loadPlayer, que la puebla, se queda allá) y aquí se accede vía
// window.getWorkoutHistory() — un getter que siempre devuelve la MISMA
// referencia de array, así que .unshift()/.pop() aquí son visibles allá
// también, sin necesidad de reasignar nada.
//
// Depende de (cargados antes en index.html):
//   - js/state.js  → window.ZenState (player, savePlayer, getCurrentRank,
//                     checkExamPending, rankTitles)
//   - js/data.js   → window.ZenData (STAT_LABELS, RELIC_EFFECTS)
// Depende de globals ya existentes en window/scope compartido (definidos
// en index.html o en el resto de app.js, resueltos en tiempo de ejecución):
//   showNotification, showConfirm, openModal, closeModal, switchView,
//   updateUI, updateLibraryUI, updateCodexUI, showAscensionCard,
//   initAudio, playBeep, playFanfare, playGong, playWhoosh, throwConfetti,
//   speakSensei, startBreathing, stopBreathing, EXERCISE_DB, zenQuotes,
//   window.getWorkoutHistory, window.UISoundEngine, window.sessionState
// ─────────────────────────────────────────────────────────────────────────
(function () {
  'use strict';

  const player = window.ZenState.getPlayer();
  const savePlayer = window.ZenState.savePlayer;
  const getCurrentRank = window.ZenState.getCurrentRank;
  const checkExamPending = window.ZenState.checkExamPending;
  const rankTitles = window.ZenState.rankTitles;
  const zendb = window.ZenState.zendb;
  const STAT_LABELS = window.ZenData.STAT_LABELS;

  // Estado de la sesión activa — antes vivía suelto al inicio de app.js;
  // confirmado que solo lo usa este clúster.
  let currentRoutine = [];
  let activeSetIndex = 0;
  let restInterval = null;
  let restSecondsLeft = 0;
  let nextExAnnounceTimeout = null;

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

  function computeTrainingInsights() {
    const insights = { overloadedStats: [], pushPullBias: null };
    const DAY = 86400000;
    const now = Date.now();
    const dated = (window.getWorkoutHistory() || []).filter(h => typeof h.timestamp === 'number' && h.timestamp >= now - 28 * DAY);
    if (dated.length === 0) return insights;

    const acuteCutoff = now - 7 * DAY;
    const acuteStat = { str: 0, spd: 0, flex: 0, end: 0 };
    const chronicStat = { str: 0, spd: 0, flex: 0, end: 0 };
    const chronicFunc = {};

    dated.forEach(h => {
      const sv = h.statVolume || {};
      const fv = h.funcVolume || {};
      Object.keys(chronicStat).forEach(s => {
        chronicStat[s] += sv[s] || 0;
        if (h.timestamp >= acuteCutoff) acuteStat[s] += sv[s] || 0;
      });
      Object.keys(fv).forEach(f => { chronicFunc[f] = (chronicFunc[f] || 0) + fv[f]; });
    });

    Object.keys(acuteStat).forEach(s => {
      const chronicWeeklyAvg = chronicStat[s] / 4;
      if (chronicWeeklyAvg >= 2) { // exige una base mínima de historial para que la señal sea confiable
        const ratio = acuteStat[s] / chronicWeeklyAvg;
        if (ratio >= 1.5) insights.overloadedStats.push(s);
      }
    });

    const push = chronicFunc['push'] || 0;
    const pull = chronicFunc['pull'] || 0;
    if (push + pull >= 6) { // muestra mínima antes de opinar sobre el balance
      if (push > pull * 1.4) insights.pushPullBias = 'pull';
      else if (pull > push * 1.4) insights.pushPullBias = 'push';
    }

    return insights;
  }

  function generateOfflineRoutine(type, focusStat = null) {
    document.getElementById('loader').style.display = 'block';

    setTimeout(() => {
      try {
      // Check-in diario: energía, fatiga general, zonas doloridas de hoy y disponibilidad de tiempo.
      // Si el usuario llegó aquí sin pasar por el modal (ej. examen de ascenso), se usan valores neutrales.
      const checkin = window.dailyCheckin || { energy: 3, soreness: 'none', soreZones: [], shortTime: false };
      const insights = computeTrainingInsights();

      // Periodización: cada 12 sesiones (aprox. 3-4 semanas a ritmo normal) se
      // programa una semana de descarga automática — menos volumen, misma
      // frecuencia. No es un castigo, es cómo entrena cualquier atleta serio.
      const isDeloadSession = !window.isExamRoutine && player.workoutCount > 0 && (player.workoutCount % 12 === 0);

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
          let userInjuries = (player.injuries || []).concat(checkin.soreZones || []); // permanentes + dolor de hoy
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
            let userInjuries = (player.injuries || []).concat(checkin.soreZones || []); // permanentes + dolor de hoy
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
            let userInjuries = (player.injuries || []).concat(checkin.soreZones || []); // permanentes + dolor de hoy
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

          // Balance push/pull: si las últimas 4 semanas muestran un desequilibrio
          // real, se corrige el conteo de ejercicios de hoy — no una preferencia
          // fija de diseño, sino una respuesta al historial real del guerrero.
          let pushCount = isLowRank ? 2 : 3;
          let pullCount = 2;
          if (insights.pushPullBias === 'pull') { pullCount += 1; pushCount = Math.max(1, pushCount - 1); }
          else if (insights.pushPullBias === 'push') { pushCount += 1; pullCount = Math.max(1, pullCount - 1); }

          selected.push(...fetchExercises(getPush, pushCount, pLvlStr));
          selected.push(...fetchExercises(getPull, pullCount, pLvlStr));
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

      // Ajuste por check-in: sesión corta → recorta el volumen de ejercicios.
      // No aplica en el Examen de Ascenso (una prueba de honor no se acorta).
      if (checkin.shortTime && !window.isExamRoutine && selected.length > 4) {
        selected = selected.slice(0, 4);
      }

      // Mensaje del Oráculo reflejando los ajustes reales hechos por el check-in de hoy
      if (!window.isExamRoutine) {
        let notes = [];
        if (checkin.energy <= 2) notes.push("baja energía");
        if (checkin.soreness === 'heavy') notes.push("fatiga muscular intensa");
        if (checkin.soreZones && checkin.soreZones.length > 0) notes.push(`molestias en ${checkin.soreZones.length === 1 ? 'una zona' : 'varias zonas'}`);
        if (checkin.shortTime) notes.push("poco tiempo disponible");
        if (player.lastWorkoutFeedback === 'hard') notes.push("tu última sesión fue muy dura");
        if (insights.overloadedStats.length > 0) {
          const labels = insights.overloadedStats.map(s => STAT_LABELS[s] || s).join(', ');
          notes.push(`sobrecarga reciente en ${labels}`);
        }
        if (isDeloadSession) notes.push("toca semana de descarga programada");
        if (notes.length > 0) {
          window.currentAiMessage += ` El Oráculo detectó ${notes.join(', ')} en tu check-in de hoy y ajustó el volumen y los ejercicios en consecuencia — el esfuerzo constante importa más que forzar un mal día.`;
        } else if (player.lastWorkoutFeedback === 'easy') {
          window.currentAiMessage += ` Tu última sesión te resultó fácil — el Oráculo subió ligeramente el volumen de hoy. Sigue así.`;
        }
        if (insights.pushPullBias) {
          window.currentAiMessage += ` También notó un desequilibrio entre empuje y tracción en tus últimas semanas y ajustó hoy el reparto para corregirlo.`;
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

        // Ajuste por check-in: energía muy baja → carga levemente reducida (no cero esfuerzo, solo prudencia)
        if (!isExam && checkin.energy === 1) {
          finalVal = Math.max(ex.baseVal, Math.round(finalVal * 0.85));
        }
        // Periodización: semana de descarga → misma lógica de prudencia en la carga
        if (isDeloadSession) {
          finalVal = Math.max(ex.baseVal, Math.round(finalVal * 0.85));
        }
        
        let numSets = 2; // Default (Rank 0-1)
        if ((player.rankIndex || 0) >= 6) numSets = 4; // Rank 6+
        else if ((player.rankIndex || 0) >= 2) numSets = 3; // Rank 2-5

        if (type === 'mobility') numSets = 2;
        if (isExam) numSets += 1;

        // relic_scroll passive effect: series extra según su tier (max 5 totales)
        if (player.equippedRelic === 'relic_scroll') {
          numSets += relicEffectFor('relic_scroll', 'bonusSets') || 1;
        }

        // Ajuste por check-in: baja energía o fatiga muscular general → menos series,
        // no menos calidad. No se aplica en el Examen de Ascenso (isExam).
        if (!isExam) {
          if (checkin.energy <= 2) numSets -= 1;
          if (checkin.soreness === 'heavy') numSets -= 1;
        }

        // Progresión real: si la sesión anterior se sintió fácil, sube un poco el volumen;
        // si fue muy dura, baja un poco. "Justo"/sin registro no cambia nada. No aplica en Examen.
        if (!isExam) {
          if (player.lastWorkoutFeedback === 'easy') numSets += 1;
          else if (player.lastWorkoutFeedback === 'hard') numSets -= 1;
        }

        // ACWR: esta estadística viene recibiendo bastante más carga de la habitual
        // en la última semana — se reduce el volumen para prevenir sobreuso.
        if (!isExam && insights.overloadedStats.includes(ex.s)) {
          numSets -= 1;
        }

        // Periodización: semana de descarga programada — menos volumen esta vez.
        if (isDeloadSession) {
          numSets -= 1;
        }

        numSets = Math.max(1, Math.min(5, numSets));

        return {
          id: ex.id,
          n: `${ex.n} (${ex.real})`,
          r: `${finalVal} ${ex.t === "time" ? "segs" : "reps"}`,
          t: ex.t,
          val: finalVal,
          s: ex.s,
          f: ex.f,
          domain: ex.domain,
          sets: numSets,
          desc: ex.desc,
          m: ex.m,
          alt: ex.alt
        };
      });

      currentRoutine = routine;
      clearRoutineWatchdog();
      document.getElementById('loader').style.display = 'none';
      renderOverview(routine);

      } catch (err) {
        console.error("ZenRyu: Error in offline generator", err);
        clearRoutineWatchdog();
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
    let soreZones = Array.from(document.querySelectorAll('.ci-zone:checked')).map(cb => cb.value);
    let shortTime = document.getElementById('ci-shorttime').checked;

    window.dailyCheckin = {
      energy: energy,
      soreness: soreness,
      soreZones: soreZones,
      shortTime: shortTime
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

    armRoutineWatchdog();
    generateOfflineRoutine(type, focusStat);
  }

  // Red de seguridad contra pantalla negra: si por cualquier motivo ajeno a
  // nuestra lógica (pestaña en segundo plano, hipo del navegador, etc.) la
  // rutina no termina de mostrarse, esto la recupera en vez de dejarla
  // atascada para siempre. generateOfflineRoutine limpia este watchdog en
  // cuanto termina con éxito (o con error ya manejado).
  function armRoutineWatchdog() {
    clearRoutineWatchdog();
    window._routineWatchdog = setTimeout(() => {
      const loaderEl = document.getElementById('loader');
      const contentEl = document.getElementById('overview-content');
      const stillStuck = (loaderEl && loaderEl.style.display !== 'none') ||
                          (contentEl && contentEl.style.display !== 'block');
      if (stillStuck) {
        if (loaderEl) loaderEl.style.display = 'none';
        switchView('home-view', 'routine-overview-view');
        showNotification(
          "Algo interrumpió la forja de tu rutina (posiblemente tu navegador o conexión). No se perdió ningún progreso — inténtalo de nuevo.",
          "⚠️ Interrupción Temporal"
        );
      }
      window._routineWatchdog = null;
    }, 6000);
  }

  function clearRoutineWatchdog() {
    if (window._routineWatchdog) {
      clearTimeout(window._routineWatchdog);
      window._routineWatchdog = null;
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
    armRoutineWatchdog();
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
        
        let statVolume = { str: 0, spd: 0, flex: 0, end: 0 };
        let funcVolume = {};
        (currentRoutine || []).forEach(ex => {
          const load = ex.sets || 1; // usamos las series prescritas como proxy simple de volumen
          if (statVolume[ex.s] !== undefined) statVolume[ex.s] += load;
          if (ex.f) funcVolume[ex.f] = (funcVolume[ex.f] || 0) + load;
        });

        let histEntry = {
          date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: typeName,
          timestamp: Date.now(), // fecha real (no localizada) para calcular ventanas de 7/28 días
          statVolume: statVolume,
          funcVolume: funcVolume
        };
        window.getWorkoutHistory().unshift(histEntry);
        if (window.getWorkoutHistory().length > 50) window.getWorkoutHistory().pop();

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
        let jadeEarned = 0;
        if (player.rankIndex < rankTitles.length - 1) {
          player.rankIndex++;
          // Jade — moneda premium, solo se gana en hitos raros como este.
          // Sin compra real conectada todavía (ver plan de Fase 3/4).
          jadeEarned = 10;
          player.gems = (player.gems || 0) + jadeEarned;
        }
        window._lastJadeEarned = jadeEarned; // lo lee showAscensionCard para mostrarlo
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
    clearTimeout(nextExAnnounceTimeout); // limpiar cualquier aviso residual de una sesión anterior

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

  // Descanso adaptativo: antes era un número fijo (90s) o solo escalado por
  // rango. Ahora combina AMBAS señales: una base según la demanda real del
  // ejercicio (fuerza compuesta necesita más recuperación que movilidad o
  // núcleo), y luego un factor de reducción por rango (un guerrero más
  // condicionado recupera algo más rápido, pero nunca por debajo de un piso
  // seguro).
  function getAdaptiveRestSeconds(ex) {
    if (!ex) return 60;
    let base;
    if (ex.s === 'flex') base = 15; // movilidad/estiramiento — casi no necesita descanso
    else if (ex.f === 'core' || ex.f === 'cardio') base = 30; // resistencia/estabilidad — recuperación rápida
    else if (ex.f === 'push' || ex.f === 'pull' || ex.f === 'legs' || ex.f === 'iso_legs' || ex.f === 'lower') base = 75; // fuerza compuesta — mayor demanda neuromuscular
    else if (ex.s === 'spd') base = 60; // explosividad — recuperación neural moderada
    else base = 60;

    const rankIdx = player.rankIndex || 0;
    const factor = rankIdx >= 7 ? 0.75 : rankIdx >= 4 ? 0.9 : 1;
    return Math.max(12, Math.round(base * factor));
  }

  // Devuelve la magnitud real de un efecto de reliquia, según el tier que
  // el jugador tiene en ESA reliquia (no un porcentaje fijo). Antes cada
  // punto del código tenía su propio número hardcodeado — ahora todos
  // consultan esta única tabla (window.ZenData.RELIC_EFFECTS).
  function relicEffectFor(relicId, key) {
    const table = window.ZenData.RELIC_EFFECTS[relicId];
    if (!table || !table[key]) return undefined;
    const tier = (player.relicTiers && player.relicTiers[relicId]) || 1;
    const idx = Math.min(Math.max(tier, 1), table[key].length) - 1;
    return table[key][idx];
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
      
      // Trigger rest timer HUD — adaptativo por tipo de ejercicio + rango
      triggerRestTimer(getAdaptiveRestSeconds(currentRoutine[exIndex]));
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

    // Apply equipped relic bonuses to XP (magnitud según el tier real de la reliquia)
    let xpBonusDesc = "";
    if (player.equippedRelic === 'relic_oni' && s === 'str') {
      let pct = relicEffectFor('relic_oni', 'xpPercent') || 0.15;
      let bonus = Math.round(xp * pct);
      xp += bonus;
      xpBonusDesc = ` (+${bonus} XP Máscara Oni 👹)`;
    } else if (player.equippedRelic === 'relic_blade' && s === 'end') {
      let pct = relicEffectFor('relic_blade', 'xpPercent') || 0.15;
      let bonus = Math.round(xp * pct);
      xp += bonus;
      xpBonusDesc = ` (+${bonus} XP Hoja Ancestral 🗡️)`;
    } else if (player.equippedRelic === 'relic_crown') {
      let pct = relicEffectFor('relic_crown', 'xpPercent') || 0.20;
      let bonus = Math.round(xp * pct);
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
      if (window.getWorkoutHistory() && window.getWorkoutHistory().length > 0) {
        // No asumimos que el array viene ordenado por fecha (el orden de
        // IndexedDB al cargar la página no lo garantiza) — buscamos
        // explícitamente la entrada más reciente por timestamp; si el
        // historial es enteramente legado (sin timestamp), usamos [0]
        // como mejor esfuerzo, igual que antes.
        let mostRecent = null;
        window.getWorkoutHistory().forEach(h => {
          if (typeof h.timestamp === 'number' && (!mostRecent || h.timestamp > mostRecent.timestamp)) {
            mostRecent = h;
          }
        });
        let referenceEntry = mostRecent || window.getWorkoutHistory()[0];
        if (referenceEntry && referenceEntry.date) {
          lastWorkoutDateStr = referenceEntry.date.split(' ')[0];
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
        // Lógica de Salvaguarda de Racha (relic_fang) — en tier 3 ya no se destruye al usarse
        if (player.equippedRelic === 'relic_fang') {
          const breaksOnUse = relicEffectFor('relic_fang', 'breaksOnUse');
          if (breaksOnUse !== false) {
            player.equippedRelic = null;
            player.unlockedItems = player.unlockedItems.filter(i => i !== 'relic_fang');
          }
          rachaSalvada = true;
          player.streak = (player.streak || 0) + 1;
        } else {
          player.streak = 1;
        }
      }

      // ─── CALCULAR Y ENSEÑAR MONEDAS GANADAS ──────────────────────────────
      const baseCoins = 50 + (currentRoutine.length * 15);
      
      // relic_incense multiplica el bono de racha — magnitud según su tier
      let streakBonusMultiplier = 10;
      let streakBonusCap = 50;
      let incenseGlow = "";
      if (player.equippedRelic === 'relic_incense') {
        streakBonusMultiplier = relicEffectFor('relic_incense', 'streakMultiplier') || 20;
        streakBonusCap = relicEffectFor('relic_incense', 'streakCap') || 100;
        incenseGlow = " 🕯️";
      }
      
      const streakBonus = Math.min(streakBonusCap, (player.streak || 0) * streakBonusMultiplier);
      let coinsEarned = baseCoins + streakBonus;
      let relicBonusCoins = 0;
      let relicBonusDesc = "";

      // Relics multipliers — magnitud según el tier real de cada reliquia
      if (player.equippedRelic === 'relic_magatama') {
        let pct = relicEffectFor('relic_magatama', 'coinPercent') || 0.25;
        relicBonusCoins = Math.round(coinsEarned * pct);
        coinsEarned += relicBonusCoins;
        relicBonusDesc = ` (+${relicBonusCoins} por Magatama 🌀)`;
      } else if (player.equippedRelic === 'relic_crown') {
        let pct = relicEffectFor('relic_crown', 'coinPercent') || 0.20;
        relicBonusCoins = Math.round(coinsEarned * pct);
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
      clearTimeout(nextExAnnounceTimeout); // por si quedaba un aviso pendiente del ejercicio anterior
      playFanfare();
      throwConfetti();
      speakSensei(`Sesión completada con honor, ${player.name}. El Templo reconoce tu disciplina. Descansa y vuelve más fuerte.`);

      // Momento de valor demostrado: justo tras la PRIMERA sesión completada
      // (no en cada carga de la app) es cuando tiene sentido invitar a
      // instalar — el usuario ya sintió lo que ofrece el Dojo.
      if (player.workoutCount === 1 && window.maybeShowInstallGate) {
        setTimeout(() => window.maybeShowInstallGate(), 3500);
      }
    } else {
      // Descanso adaptativo antes del siguiente ejercicio (antes: 90s fijos)
      triggerRestTimer(getAdaptiveRestSeconds(currentRoutine[index]), true);

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
        // Announce next exercise details after a brief delay so it doesn't collide with the transition beep.
        // Se guarda el id para poder cancelarlo si el usuario avanza más rápido que estos 4s
        // (ej. terminando toda la rutina antes de que este aviso llegue a sonar).
        clearTimeout(nextExAnnounceTimeout);
        nextExAnnounceTimeout = setTimeout(() => {
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


})();
