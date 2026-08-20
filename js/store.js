// js/store.js
// ─────────────────────────────────────────────────────────────────────────
// Módulo de TIENDA — Zen Ryu Sensei
//
// Extraído de app.js sin cambios de comportamiento: renderizado del bazar,
// compra/equipar auras y reliquias, y aplicación de inventario (temas,
// partículas, botones de música desbloqueados).
//
// Este módulo SÍ toca el DOM directamente (a diferencia de state.js/data.js)
// porque hoy la app no separa "lógica de compra" de "renderizado" — es
// una simplificación consciente de esta fase del refactor: mover código
// tal cual, verificar que sigue funcionando, y solo entonces considerar
// separar más finamente lógica vs. render si hiciera falta.
//
// Depende de (cargados antes en index.html):
//   - js/state.js  → window.ZenState (player, savePlayer)
//   - js/data.js   → window.ZenData (STORE_ITEMS)
// Depende de globals ya existentes en window (definidos en index.html o
// en el resto de app.js, se resuelven en tiempo de ejecución, no de carga):
//   showNotification, openModal, closeModal, applyInventory (este mismo
//   módulo la define), renderProfileVault, openBookReader, window.UISoundEngine
// ─────────────────────────────────────────────────────────────────────────
(function () {
  'use strict';

  const player = window.ZenState.getPlayer();
  const STORE_ITEMS = window.ZenData.STORE_ITEMS;
  const savePlayer = window.ZenState.savePlayer;

  let currentStoreTab = 'aura';

  window.openStoreModal = function () {
    document.getElementById('store-coin-display').innerText = player.coins || 0;
    const gemDisplay = document.getElementById('store-gem-display');
    if (gemDisplay) gemDisplay.innerText = player.gems || 0;
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
      if (currentStoreTab === 'aura') return item.type === 'aura' && typeof item.seasonMonth !== 'number'; // las zodiacales viven en su propia pestaña
      if (currentStoreTab === 'relic') return item.type === 'relic';
      if (currentStoreTab === 'zodiac') return typeof item.seasonMonth === 'number';
      return item.type === currentStoreTab;
    });

    if (filteredItems.length === 0) {
      container.innerHTML = '<p style="text-align:center; color:#555; font-style:italic; padding:40px;">No hay objetos disponibles en esta sección por ahora.</p>';
      return;
    }

    const MONTH_NAMES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const currentMonth = new Date().getMonth();

    filteredItems.forEach(item => {
      let unl = window.player ? window.player.unlockedItems.includes(item.id) : player.unlockedItems.includes(item.id);
      let isEquipped = window.player ? (window.player.activeAura === item.id) : (player.activeAura === item.id);
      let actionBtn = '';
      let tierBadge = '';

      const isSeasonalLocked = typeof item.seasonMonth === 'number' && item.seasonMonth !== currentMonth && !unl;

      if (isSeasonalLocked) {
        // Bloqueada por temporada: vitrina de lo que viene, sin precio ni presión de countdown.
        actionBtn = `<button class="btn-secondary" disabled style="width:100%; font-size:0.75rem; opacity:0.55; cursor:not-allowed; border-color:#555;">🔒 Disponible en ${MONTH_NAMES[item.seasonMonth]}</button>`;
      } else if (!unl) {
        const currency = item.currency || 'coins';
        const priceLabel = currency === 'gems' ? `💎 COMPRAR (${item.price})` : `🪙 COMPRAR (${item.price})`;
        actionBtn = `<button class="btn-primary" onclick="buyStoreItem('${item.id}')" style="width:100%; font-size:0.8rem; background:#333; color:var(--accent-gold); border-color:var(--accent-gold);">${priceLabel}</button>`;
      } else {
        if (item.type === 'aura') {
          actionBtn = `<button class="btn-secondary" onclick="equipAura('${item.id}'); renderStore();" style="width:100%; font-size:0.8rem; background:${isEquipped ? 'var(--accent-gold)' : '#111'}; color:${isEquipped ? '#000' : 'var(--accent-gold)'};">${isEquipped ? 'EQUIPADA' : 'EQUIPAR'}</button>`;
        } else if (item.type === 'frame') {
          let isFrameEq = player.activeFrame === item.id;
          actionBtn = `<button class="btn-secondary" onclick="equipFrame('${item.id}'); renderStore();" style="width:100%; font-size:0.8rem; background:${isFrameEq ? 'var(--accent-gold)' : '#111'}; color:${isFrameEq ? '#000' : 'var(--accent-gold)'};">${isFrameEq ? 'EQUIPADO' : 'EQUIPAR'}</button>`;
        } else if (item.type === 'book') {
          actionBtn = `<button class="btn-secondary" onclick="openBookReader('${item.id}', 'store-modal');" style="width:100%; font-size:0.8rem; border-color:#00ffff; color:#00ffff;">LEER LIBRO 📖</button>`;
        } else if (item.type === 'relic') {
          let isEq = player.equippedRelic === item.id;
          let tier = (player.relicTiers && player.relicTiers[item.id]) || 1;
          let maxTier = item.maxTier || 1;
          tierBadge = `<span style="display:inline-block; margin-bottom:6px; font-size:0.6rem; color:var(--accent-gold); border:1px solid rgba(255,215,0,0.3); border-radius:10px; padding:2px 8px;">⚗️ TIER ${tier}/${maxTier}</span>`;

          let equipBtn = `<button class="btn-secondary" onclick="toggleRelic('${item.id}'); renderStore();" style="flex:1; font-size:0.75rem; background:${isEq ? 'var(--accent-gold)' : '#111'}; color:${isEq ? '#000' : 'var(--accent-gold)'}; border-color:${isEq ? 'var(--accent-gold)' : '#555'};">${isEq ? 'EQUIPADA' : 'EQUIPAR'}</button>`;

          let upgradeBtn = '';
          if (tier < maxTier) {
            const cost = window.getRelicUpgradeCost(item.id);
            upgradeBtn = `<button class="btn-secondary" onclick="upgradeRelic('${item.id}')" style="flex:1; font-size:0.75rem; border-color:#00cc66; color:#00cc66;">⬆️ MEJORAR (${cost})</button>`;
          } else {
            upgradeBtn = `<button class="btn-secondary" disabled style="flex:1; font-size:0.7rem; opacity:0.6; cursor:not-allowed; border-color:#555;">TIER MÁXIMO</button>`;
          }
          actionBtn = `<div style="display:flex; gap:6px;">${equipBtn}${upgradeBtn}</div>`;
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
          ${tierBadge}
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
    if (typeof item.seasonMonth === 'number' && item.seasonMonth !== new Date().getMonth()) {
      showNotification("Esta esencia zodiacal aún no despierta — vuelve en su mes correspondiente.", "☯️ Fuera de Temporada");
      return;
    }
    const currency = item.currency || 'coins'; // por defecto coins, para no romper ítems antiguos sin el campo
    const balance = currency === 'gems' ? (player.gems || 0) : (player.coins || 0);
    if (balance < item.price) {
      if (currency === 'gems') {
        showNotification("No tienes suficiente Jade. Se gana en hitos raros del camino — sigue avanzando.", "💎 Jade Insuficiente");
      } else {
        showNotification("No tienes suficientes Monedas Zen. Sigue forjando tu espíritu en el dojo para amasar fortuna.", "🪙 Monedas Insuficientes");
      }
      return;
    }
    if (currency === 'gems') { player.gems -= item.price; } else { player.coins -= item.price; }
    player.unlockedItems.push(item.id);
    if (item.type === 'relic') {
      if (!player.relicTiers) player.relicTiers = {};
      player.relicTiers[item.id] = 1; // toda reliquia nace en tier 1
    }
    savePlayer();
    document.getElementById('store-coin-display').innerText = player.coins;
    const gemDisplay = document.getElementById('store-gem-display');
    if (gemDisplay) gemDisplay.innerText = player.gems || 0;
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

  window.equipFrame = function (id) {
    if (player.activeFrame === id) {
      player.activeFrame = null;
    } else {
      player.activeFrame = id;
    }
    savePlayer();
    applyInventory();
    renderStore();
    if (window.renderProfileVault) renderProfileVault();
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

  // Costo de mejora: multiplica el precio base de la reliquia. Índice 0 =
  // costo para pasar de tier 1→2, índice 1 = tier 2→3. Sube el costo cada
  // vez — es intencional, es el sumidero de monedas recurrente.
  const RELIC_UPGRADE_COST_MULTIPLIER = [1.5, 2.5];

  window.getRelicUpgradeCost = function (relicId) {
    const item = STORE_ITEMS.find(i => i.id === relicId);
    if (!item) return null;
    const maxTier = item.maxTier || 1;
    const currentTier = (player.relicTiers && player.relicTiers[relicId]) || 1;
    if (currentTier >= maxTier) return null; // ya está al máximo
    const mult = RELIC_UPGRADE_COST_MULTIPLIER[currentTier - 1] || 3;
    return Math.round(item.price * mult);
  };

  window.upgradeRelic = function (relicId) {
    const item = STORE_ITEMS.find(i => i.id === relicId);
    if (!item || item.type !== 'relic') return;
    if (!player.unlockedItems.includes(relicId)) return; // no la posee

    const cost = window.getRelicUpgradeCost(relicId);
    if (cost === null) {
      showNotification("Esta reliquia ya alcanzó su forma máxima.", "⚗️ Nivel Máximo");
      return;
    }
    if ((player.coins || 0) < cost) {
      showNotification(`Necesitas ${cost} Monedas Zen para forjar esta mejora. Sigue entrenando.`, "🪙 Monedas Insuficientes");
      return;
    }

    player.coins -= cost;
    if (!player.relicTiers) player.relicTiers = {};
    player.relicTiers[relicId] = ((player.relicTiers[relicId] || 1) + 1);
    savePlayer();
    if (window.UISoundEngine) window.UISoundEngine.playSwoosh();
    showNotification(`${item.name} ha sido forjada a un nuevo nivel (Tier ${player.relicTiers[relicId]}). Sus efectos son ahora más poderosos.`, "⚗️ Reliquia Mejorada");
    renderStore();
    const rwCoins = document.getElementById('player-coins');
    if (rwCoins) rwCoins.innerText = player.coins;
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
            for (let i = 0; i < 30; i++) {
              let w = Math.random() * 5 + 2;
              weatherLayer.innerHTML += `<div class="snow-flake" style="width:${w}px; height:${w}px; left:${Math.random() * 100}vw; animation-duration:${Math.random() * 3 + 2}s; animation-delay:-${Math.random() * 5}s"></div>`;
            }
          }
        } else if (aura.id === 'aura_solar') {
          document.body.classList.add('theme-solar');
          if (weatherLayer) {
            for (let i = 0; i < 25; i++) {
              let w = Math.random() * 4 + 2;
              weatherLayer.innerHTML += `<div class="ember" style="width:${w}px; height:${w}px; left:${Math.random() * 100}vw; animation-duration:${Math.random() * 4 + 3}s; animation-delay:-${Math.random() * 5}s"></div>`;
            }
          }
        } else if (aura.id === 'aura_sombra') {
          document.body.classList.add('theme-sombra');
          if (weatherLayer) {
            for (let i = 0; i < 15; i++) {
              let w = Math.random() * 80 + 30; // Larger shadowy blobs
              weatherLayer.innerHTML += `<div class="shadow-blob" style="width:${w}px; height:${w}px; left:${Math.random() * 100}vw; top:${Math.random() * 100}vh; animation-duration:${Math.random() * 5 + 4}s; animation-delay:-${Math.random() * 5}s"></div>`;
            }
          }
        } else if (aura.id === 'aura_sangre') {
          document.body.classList.add('theme-sangre');
          if (weatherLayer) {
            for (let i = 0; i < 35; i++) {
              let w = Math.random() * 5 + 2;
              weatherLayer.innerHTML += `<div class="blood-particle" style="width:${w}px; height:${w}px; left:${Math.random() * 100}vw; animation-duration:${Math.random() * 3 + 2}s; animation-delay:-${Math.random() * 5}s"></div>`;
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

      // Marco de avatar: quita cualquier clase frame-* anterior y aplica la activa
      avatarEl.classList.remove('frame-jade', 'frame-crimson', 'frame-obsidian', 'frame-celestial');
      if (player.activeFrame) {
        const frameMeta = STORE_ITEMS.find(i => i.id === player.activeFrame);
        if (frameMeta && frameMeta.meta) avatarEl.classList.add(frameMeta.meta);
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
})();
