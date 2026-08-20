// js/data.js
// ─────────────────────────────────────────────────────────────────────────
// Módulo de DATOS — Zen Ryu Sensei
//
// Contiene: catálogo de insignias (BADGE_DB), catálogo de la tienda
// (STORE_ITEMS) y la tabla de efectos por tier de las reliquias
// (RELIC_EFFECTS). Es solo datos + funciones puras de consulta — nada de
// DOM ni de persistencia (eso vive en state.js).
//
// Sistema de economía (Fase 3/4):
//  - Todo ítem de STORE_ITEMS tiene `currency: 'coins'` explícito. Cuando
//    exista el Jade (moneda premium), los ítems nuevos dirán `currency:
//    'gems'`.
//  - Las reliquias (`type: 'relic'`) llevan `maxTier: 3` en el catálogo
//    (tope fijo, igual para todos). El TIER ACTUAL de cada reliquia es
//    específico de cada jugador — vive en `player.relicTiers[id]` (ver
//    js/state.js), no en el catálogo, porque dos jugadores con la misma
//    reliquia pueden tener tiers distintos.
//  - RELIC_EFFECTS define la magnitud real de cada efecto por tier. Todo
//    el código que antes tenía porcentajes hardcodeados (`equippedRelic
//    === 'relic_oni'` con un +15% fijo) ahora consulta esta tabla — ver
//    getRelicEffect() en app.js.
// ─────────────────────────────────────────────────────────────────────────
(function () {
  'use strict';

  const BADGE_DB = [
    // --- Metas de Racha ---
    { id: 'b_streak_3', name: 'Llama Naciente', icon: '🔥', desc: 'Alcanza una racha de 3 días.', goal: (p) => p.streak >= 3 },
    { id: 'b_streak_7', name: 'Llama Eterna', icon: '🏮', desc: 'Alcanza una racha de 7 días.', goal: (p) => p.streak >= 7 },
    { id: 'b_streak_14', name: 'Corazón de Fénix', icon: '🦅', desc: 'Alcanza una racha inquebrantable de 14 días.', goal: (p) => p.streak >= 14 },
    { id: 'b_streak_30', name: 'Espíritu de Montaña', icon: '🗻', desc: 'Alcanza una racha sagrada de 30 días seguidos.', goal: (p) => p.streak >= 30 },

    // --- Metas de Nivel (Especialización) ---
    { id: 'b_lvl_5', name: 'Iniciado ZEN', icon: '🥋', desc: 'Alcanza el nivel 5 de fuerza o resistencia.', goal: (p) => p.stats.str.lvl >= 5 || p.stats.end.lvl >= 5 },
    { id: 'b_lvl_10', name: 'Guerrero de Élite', icon: '🗡️', desc: 'Alcanza el nivel 10 en cualquier estadística.', goal: (p) => Object.values(p.stats).some(s => s.lvl >= 10) },
    { id: 'b_lvl_30', name: 'Maestro Disciplinado', icon: '⚡', desc: 'Alcanza el nivel 30 en una disciplina singular.', goal: (p) => Object.values(p.stats).some(s => s.lvl >= 30) },
    { id: 'b_lvl_50', name: 'Cinturón Negro', icon: '⛩️', desc: 'Domina un atributo físico hasta el Nivel 50.', goal: (p) => Object.values(p.stats).some(s => s.lvl >= 50) },
    { id: 'b_lvl_100', name: 'Sensei Ascendido', icon: '🐉', desc: 'Corona el nivel 100 y conviértete en una Leyenda.', goal: (p) => Object.values(p.stats).some(s => s.lvl >= 100) },

    // --- Metas de Equilibrio ---
    { id: 'b_balance_15', name: 'El Camino del Loto', icon: '💠', desc: 'Lleva TODAS tus estadísticas base al Nivel 15.', goal: (p) => Object.values(p.stats).every(s => s.lvl >= 15) },

    // --- Metas de Esfuerzo Físico ---
    { id: 'b_first_blood', name: 'El Primer Paso', icon: '👣', desc: 'Completa tu primer entrenamiento.', goal: (p) => p.workoutCount >= 1 },
    { id: 'b_library', name: 'Científico del Dojo', icon: '🧠', desc: 'Realiza 10 entrenamientos totales terminados.', goal: (p) => p.workoutCount >= 10 },
    { id: 'b_library_50', name: 'Alma Curtída', icon: '🩸', desc: 'Rompe la barrera y registra 50 entrenamientos.', goal: (p) => p.workoutCount >= 50 },
    { id: 'b_library_100', name: 'Demonio Marcial', icon: '🦾', desc: 'Sobrevive impecablemente a 100 batallas y sesiones.', goal: (p) => p.workoutCount >= 100 },

    // --- Economía y Bazar ---
    { id: 'b_rich', name: 'Bolsillos de Oro', icon: '💰', desc: 'Acumula las preciadas 1,000 Monedas Zen.', goal: (p) => p.coins >= 1000 },
    { id: 'b_rich_5000', name: 'Templo de Abundancia', icon: '🪙', desc: 'Amasa fortuna letal poseyendo 5,000 Monedas Zen.', goal: (p) => p.coins >= 5000 },
    { id: 'b_rich_10000', name: 'Dragón de Oro', icon: '💎', desc: 'Leyenda del comercio: 10,000 Monedas Zen.', goal: (p) => p.coins >= 10000 },

    // --- Coleccionista ---
    { id: 'b_collector', name: 'Almacén del Dragón', icon: '🎒', desc: 'Desbloquea 5 objetos oscuros o reliquias de la tienda.', goal: (p) => (p.unlockedItems ? p.unlockedItems.length : 0) >= 5 },
    { id: 'b_collector_max', name: 'Curador del Templo', icon: '🏺', desc: 'Consigue 10 artefactos sagrados.', goal: (p) => (p.unlockedItems ? p.unlockedItems.length : 0) >= 10 },

    // --- Devoción Suprema ---
    { id: 'b_streak_100', name: 'Trascendencia', icon: '🌌', desc: 'Devoción irreal: Racha de 100 Días Seguidos.', goal: (p) => p.streak >= 100 }
  ];

  const STORE_ITEMS = [
    // ===== AURAS =====
    { id: 'aura_zafiro', type: 'aura', name: 'Aura Zafiro', desc: 'Remplaza el dorado del Dojo con un frío resplandor azul.', price: 500, currency: 'coins', icon: '🔵', meta: '#00ccff' },
    { id: 'aura_abismal', type: 'aura', name: 'Aura Abismal', desc: 'Sume el Dojo en una atmósfera de veneno oscuro.', price: 500, currency: 'coins', icon: '🟣', meta: '#aa00ff' },
    { id: 'aura_carmesi', type: 'aura', name: 'Aura Carmesí', desc: 'El color de la sangre guerrera tiñe cada rincón del Templo.', price: 600, currency: 'coins', icon: '🔴', meta: '#ff2244' },
    { id: 'aura_jade', type: 'aura', name: 'Aura Jade Imperial', desc: 'El verde sagrado de los emperadores antiguos envuelve el Dojo.', price: 700, currency: 'coins', icon: '🟢', meta: '#00cc66' },
    { id: 'aura_hielo', type: 'aura', name: 'Aura Escarcha Boreal', desc: 'Un frío glacial del norte ancestral recorre las paredes del Templo.', price: 750, currency: 'coins', icon: '🧊', meta: '#88ddff' },
    { id: 'aura_solar', type: 'aura', name: 'Aura Solar Divina', desc: 'La energía del sol naciente calcina toda oscuridad.', price: 800, currency: 'coins', icon: '☀️', meta: '#ff8800' },
    { id: 'aura_sombra', type: 'aura', name: 'Aura Sombra Eterna', desc: 'Solo los más dignos entrenan sumidos en la nada absoluta.', price: 1000, currency: 'coins', icon: '🌑', meta: '#555577' },
    { id: 'aura_sangre', type: 'aura', name: 'Aura Sangre de Dragón', desc: 'El ichor del último dragón resplandece en cada fibra del Dojo.', price: 1500, currency: 'coins', icon: '🐉', meta: '#cc0033' },

    // ===== AURAS EXCLUSIVAS (Jade) =====
    { id: 'aura_lunar', type: 'aura', name: 'Aura Cristal Lunar', desc: 'Exclusiva. Un resplandor plateado y sereno, reservado para quienes han cruzado el umbral del Jade.', price: 20, currency: 'gems', icon: '🌙', meta: '#c8d0e0' },
    { id: 'aura_fenix', type: 'aura', name: 'Aura Fénix Ancestral', desc: 'Exclusiva. El fuego que renace de sus cenizas — un privilegio de quienes ascienden con constancia.', price: 35, currency: 'gems', icon: '🔥', meta: '#ff6b1a' },

    // ===== MARCOS DE AVATAR =====
    { id: 'frame_jade', type: 'frame', name: 'Marco de Jade', desc: 'Un anillo esmeralda enmarca tu avatar — la disciplina hecha visible.', price: 400, currency: 'coins', icon: '🟢', meta: 'frame-jade' },
    { id: 'frame_crimson', type: 'frame', name: 'Marco Carmesí', desc: 'Un borde escarlata que anuncia intensidad de combate.', price: 400, currency: 'coins', icon: '🔴', meta: 'frame-crimson' },
    { id: 'frame_obsidian', type: 'frame', name: 'Marco Obsidiana', desc: 'Líneas quebradas de piedra volcánica — para los guerreros silenciosos.', price: 400, currency: 'coins', icon: '⚫', meta: 'frame-obsidian' },
    { id: 'frame_celestial', type: 'frame', name: 'Marco Celestial', desc: 'Exclusivo. Un halo dorado pulsante, reservado para quienes portan Jade.', price: 15, currency: 'gems', icon: '✨', meta: 'frame-celestial' },

    // ===== MÚSICA =====
    { id: 'mus_taiko', type: 'music', name: 'Sinfonía Taiko', desc: 'Desbloquea tambores de guerra en la Emisora Astral.', price: 150, currency: 'coins', icon: '🥁', meta: 'audio-taiko' },
    { id: 'mus_synth', type: 'music', name: 'Cyber-Dojo Beat', desc: 'Desbloquea pulsos synthwave en la Emisora.', price: 150, currency: 'coins', icon: '🎹', meta: 'audio-synth' },
    { id: 'mus_ambient', type: 'music', name: 'Niebla del Templo', desc: 'Sonidos ambientales de un monasterio perdido entre montañas.', price: 200, currency: 'coins', icon: '🌫️', meta: 'audio-ambient' },
    { id: 'mus_epic', type: 'music', name: 'Crónica Épica', desc: 'Composición orquestal para tus entrenamientos más intensos.', price: 300, currency: 'coins', icon: '⚔️', meta: 'audio-epic' },
    { id: 'mus_lofi', type: 'music', name: 'Lo-fi del Guerrero', desc: 'Beats relajados para sesiones de estiramiento y recuperación.', price: 250, currency: 'coins', icon: '🎧', meta: 'audio-lofi' },
    { id: 'mus_tribal', type: 'music', name: 'Ritual Primordial', desc: 'Percusión tribal ancestral que despierta el instinto de combate.', price: 350, currency: 'coins', icon: '🪘', meta: 'audio-tribal' },

    // ===== BIBLIOTECA DE SABIDURÍA (EPUBs) =====
    { id: 'book_art_of_war', type: 'book', name: 'El Arte de la Guerra', desc: 'Sun Tzu. La maestría táctica del General Supremo.', price: 400, currency: 'coins', icon: '📖', meta: './books/arte_guerra.epub' },
    { id: 'book_meditations', type: 'book', name: 'Meditaciones', desc: 'Marco Aurelio. Las reflexiones del Emperador Filósofo.', price: 500, currency: 'coins', icon: '📖', meta: './books/meditaciones.epub' },
    { id: 'book_tao_te_ching', type: 'book', name: 'Tao Te Ching', desc: 'Lao Tzu. El camino del flujo y el silencio interior.', price: 300, currency: 'coins', icon: '📖', meta: './books/tao_te_ching.epub' },
    { id: 'book_enquiridion', type: 'book', name: 'Enquiridión', desc: 'Epicteto. El manual práctico de la resiliencia estoica.', price: 300, currency: 'coins', icon: '📖', meta: './books/enquiridion.epub' },
    { id: 'book_dhammapada', type: 'book', name: 'Dhammapada', desc: 'Buda. Sentencias y aforismos para la elevación mental.', price: 400, currency: 'coins', icon: '📖', meta: './books/dhammapada.epub' },
    { id: 'book_analectas', type: 'book', name: 'Las Analectas', desc: 'Confucio. Los diálogos y máximas de la sabiduría oriental.', price: 400, currency: 'coins', icon: '📖', meta: './books/analectas.epub' },

    // ===== RELIQUIAS =====
    // `tier`/`maxTier`: andamiaje de datos para la futura mejora por niveles
    // (sumidero de monedas, Fase 3/4 del plan). La lógica de efecto según
    // tier todavía no está conectada — ver nota al final del archivo.
    { id: 'relic_oni', type: 'relic', name: 'Máscara Oni Destrozada', desc: 'Efecto pasivo: +XP en ejercicios de Fuerza (str). Mejora con el tier.', price: 1000, currency: 'coins', icon: '👹', meta: '', maxTier: 3 },
    { id: 'relic_blade', type: 'relic', name: 'Hoja Ancestral Oxidada', desc: 'Efecto pasivo: +XP en ejercicios de Resistencia (end). Mejora con el tier.', price: 1000, currency: 'coins', icon: '🗡️', meta: '', maxTier: 3 },
    { id: 'relic_scroll', type: 'relic', name: 'Pergamino del Fundador', desc: 'Efecto pasivo: el Oráculo prescribe series extra por ejercicio. En tier 3, dos series extra.', price: 1200, currency: 'coins', icon: '📋', meta: '', maxTier: 3 },
    { id: 'relic_magatama', type: 'relic', name: 'Magatama del Abismo', desc: 'Efecto pasivo: +monedas en cada sesión completada. Mejora con el tier.', price: 1500, currency: 'coins', icon: '🌀', meta: '', maxTier: 3 },
    { id: 'relic_incense', type: 'relic', name: 'Incienso del Templo Perdido', desc: 'Efecto pasivo: multiplica el bono de racha. Mejora con el tier.', price: 800, currency: 'coins', icon: '🕯️', meta: '', maxTier: 3 },
    { id: 'relic_fang', type: 'relic', name: 'Colmillo del Primer Dragón', desc: 'Salvaguarda de racha: protege tu racha si fallas un día. En tier 3 ya no se destruye al usarse.', price: 2000, currency: 'coins', icon: '🦷', meta: '', maxTier: 3 },
    { id: 'relic_crown', type: 'relic', name: 'Corona del Monarca Caído', desc: 'Efecto pasivo: bono global a toda ganancia de XP y Monedas. Mejora con el tier.', price: 2500, currency: 'coins', icon: '👑', meta: '', maxTier: 3 },

    // ===== AURAS ZODIACALES (rotación estacional) =====
    // Una exclusiva distinta por mes real, atada al zodiaco chino (encaja
    // con la estética del Dojo y es universal — a diferencia de "primavera/
    // invierno", no asume en qué hemisferio vive cada jugador). seasonMonth
    // usa el mismo índice que Date.getMonth() (0 = enero, 11 = diciembre).
    // Solo la del mes actual es comprable; el resto se muestra bloqueada
    // como vitrina de lo que viene, sin presión de countdown — ver
    // renderStore() en js/store.js.
    { id: 'aura_zodiac_rata', type: 'aura', name: 'Aura de la Rata', desc: 'Exclusiva de enero. Ingenio y comienzos — la astucia que abre el año.', price: 25, currency: 'gems', icon: '🐀', meta: '#8899aa', seasonMonth: 0 },
    { id: 'aura_zodiac_buey', type: 'aura', name: 'Aura del Buey', desc: 'Exclusiva de febrero. Perseverancia silenciosa, fuerza que no se apura.', price: 25, currency: 'gems', icon: '🐂', meta: '#7a5c3e', seasonMonth: 1 },
    { id: 'aura_zodiac_tigre', type: 'aura', name: 'Aura del Tigre', desc: 'Exclusiva de marzo. Coraje indomable, el salto que nadie ve venir.', price: 25, currency: 'gems', icon: '🐅', meta: '#e67e22', seasonMonth: 2 },
    { id: 'aura_zodiac_conejo', type: 'aura', name: 'Aura del Conejo', desc: 'Exclusiva de abril. Agilidad y calma — la ventaja de quien anticipa.', price: 25, currency: 'gems', icon: '🐇', meta: '#e0b8d0', seasonMonth: 3 },
    { id: 'aura_zodiac_dragon', type: 'aura', name: 'Aura del Dragón', desc: 'Exclusiva de mayo. Poder ancestral — el mismo que da nombre al Dojo.', price: 25, currency: 'gems', icon: '🐉', meta: '#ffd700', seasonMonth: 4 },
    { id: 'aura_zodiac_serpiente', type: 'aura', name: 'Aura de la Serpiente', desc: 'Exclusiva de junio. Sabiduría que se mueve sin ruido.', price: 25, currency: 'gems', icon: '🐍', meta: '#2ecc71', seasonMonth: 5 },
    { id: 'aura_zodiac_caballo', type: 'aura', name: 'Aura del Caballo', desc: 'Exclusiva de julio. Libertad e impulso — el camino recorrido sin frenos.', price: 25, currency: 'gems', icon: '🐎', meta: '#c0392b', seasonMonth: 6 },
    { id: 'aura_zodiac_cabra', type: 'aura', name: 'Aura de la Cabra', desc: 'Exclusiva de agosto. Resiliencia serena en el terreno más difícil.', price: 25, currency: 'gems', icon: '🐐', meta: '#f5deb3', seasonMonth: 7 },
    { id: 'aura_zodiac_mono', type: 'aura', name: 'Aura del Mono', desc: 'Exclusiva de septiembre. Ingenio veloz, la solución antes que el problema.', price: 25, currency: 'gems', icon: '🐒', meta: '#a0522d', seasonMonth: 8 },
    { id: 'aura_zodiac_gallo', type: 'aura', name: 'Aura del Gallo', desc: 'Exclusiva de octubre. Disciplina puntual — el que despierta al Dojo entero.', price: 25, currency: 'gems', icon: '🐓', meta: '#d35400', seasonMonth: 9 },
    { id: 'aura_zodiac_perro', type: 'aura', name: 'Aura del Perro', desc: 'Exclusiva de noviembre. Lealtad inquebrantable al camino elegido.', price: 25, currency: 'gems', icon: '🐕', meta: '#8d6e63', seasonMonth: 10 },
    { id: 'aura_zodiac_cerdo', type: 'aura', name: 'Aura del Cerdo', desc: 'Exclusiva de diciembre. Abundancia ganada — el cierre honesto de un ciclo.', price: 25, currency: 'gems', icon: '🐖', meta: '#ffb6c1', seasonMonth: 11 }
  ];

  // Magnitud real de cada reliquia por tier (índice 0 = tier 1, índice 2 = tier 3).
  // Todo valor de porcentaje está en fracción (0.15 = 15%).
  const RELIC_EFFECTS = {
    relic_oni:      { xpPercent: [0.15, 0.20, 0.25] },                          // +XP en Fuerza
    relic_blade:    { xpPercent: [0.15, 0.20, 0.25] },                          // +XP en Resistencia
    relic_crown:    { xpPercent: [0.20, 0.25, 0.30], coinPercent: [0.20, 0.25, 0.30] }, // +XP y +monedas global
    relic_scroll:   { bonusSets: [1, 1, 2] },                                   // series extra por ejercicio
    relic_magatama: { coinPercent: [0.25, 0.32, 0.40] },                        // +monedas por sesión
    relic_incense:  { streakMultiplier: [20, 25, 30], streakCap: [100, 125, 150] }, // multiplicador de racha (base sin reliquia: 10/50)
    relic_fang:     { breaksOnUse: [true, true, false] }                        // tier 3: ya no se destruye al proteger la racha
  };

  const STAT_LABELS = {
    str: 'FUERZA',
    spd: 'VELOCIDAD',
    flex: 'FLEXIBILIDAD',
    end: 'RESISTENCIA'
  };

  window.ZenData = { BADGE_DB, STORE_ITEMS, RELIC_EFFECTS, STAT_LABELS };
})();
