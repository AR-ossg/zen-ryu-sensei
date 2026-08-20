// js/debug.js
// ─────────────────────────────────────────────────────────────────────────
// Herramientas de desarrollador — NUNCA activas en producción.
//
// Solo `cheatWealth` vive aquí (el ritual de 7 toques al avatar). Antes
// `debugSystem` también vivía en este archivo, pero es un error: no es una
// trampa, es la utilidad de "Sincronizar Códice" que cualquier usuario ve
// en Ajustes para forzar la actualización de caché — así que vive en
// app.js como una función normal, siempre disponible (ver exportSave/
// importSave, justo al lado). Este archivo solo gatea lo que de verdad
// es una puerta trasera de desarrollo.
//
// Uso en desarrollo local: http://localhost:8000/?debug=1
// ─────────────────────────────────────────────────────────────────────────
(function () {
  'use strict';

  const params = new URLSearchParams(window.location.search);
  const debugEnabled = params.get('debug') === '1';

  if (!debugEnabled) return; // producción: no se registra nada en window

  console.warn("ZenRyu: modo DEBUG activo — no uses ?debug=1 en un enlace compartido.");

  window.cheatWealth = function () {
    const state = window.ZenState;
    if (!state) return;
    state.player.coins += 10000;
    state.savePlayer();
    if (window.updateUI) window.updateUI();
    console.log("ZenRyu [DEBUG]: +10,000 monedas");
    if (window.showNotification) {
      window.showNotification("Bendición de Prosperidad activada (DEBUG).", "Sincronización");
    }
  };
})();
