// database.js
// ALGORITMO DE INTELIGENCIA DE PRERARACIÓN FÍSICA MARCIAL (V6 MAX 100)

const zenQuotes = [
  "El dolor de hoy es la fuerza de mañana.",
  "El hierro se afila con hierro, el espíritu con disciplina.",
  "No busques la victoria en el combate, búscala en tu voluntad.",
  "Caer mil veces, levantarse mil y una.",
  "La verdadera maestría es dominar el propio cuerpo antes que la mente del oponente.",
  "Como el bambú: flexible en la tormenta, irrompible en su raíz.",
  "La constancia es la espada que corta la montaña de la imposibilidad.",
  "Un guerrero no se rinde ante lo que le gusta, encuentra el gusto en lo que es difícil.",
  "El sudor es la tinta con la que escribes tu leyenda.",
  "Sé como el agua, mi amigo. Fluye o golpea.",
  "El obstáculo es el camino.",
  "No es lo que te sucede, sino cómo reaccionas lo que importa.",
  "La dificultad es el alimento de las almas valientes.",
  "Desde lo uno, conoce lo diez mil.",
  "El viaje de mil millas comienza con un solo paso.",
  "La suavidad vence a la dureza; la lentitud vence a la prisa.",
  "Mañana ganarás a quien eras hoy.",
  "Aquel que se domina a sí mismo es el dueño de su destino.",
  "La disciplina es el puente entre las metas y los logros.",
  "El espíritu debe estar siempre por encima de la técnica.",
  "Vacía tu mente, sé amorfo, moldeable como el agua.",
  "La mejor venganza es ser diferente a quien causó el daño.",
  "El éxito no es el final, el fracaso no es la ruina: es el valor para seguir lo que cuenta.",
  "Un momento de paciencia puede evitar un gran desastre.",
  "La mente es un excelente sirviente, pero un maestro terrible.",
  "Si no hay enemigo en tu interior, el enemigo externo no podrá dañarte.",
  "No ores por una vida fácil, ora por la fuerza para soportar una difícil.",
  "El guerrero exitoso es un hombre promedio con un enfoque similar al láser.",
  "La potencia definitiva grita menos pero rompe con gravedad cósmica.",
  "En el centro del caos reside la oportunidad.",
  "Conocerte a ti mismo es la única victoria real sobre la tierra.",
  "La voluntad de ganar no es nada sin la voluntad de prepararse.",
  "El reposo es el maestro del movimiento; el silencio el padre de la acción.",
  "Un verdadero filo mantiene su borde incluso en la masacre del agotamiento.",
  "La paciencia afila la cuchilla; la agresión ciega solo la agota.",
  "No te detengas cuando te canses, detente cuando hayas terminado.",
  "El único oponente real eres tú mismo hace un minuto.",
  "Excava el pozo antes de tener sed; forja el músculo antes del combate.",
  "La maestría no es un destino, es el sendero que caminas hoy.",
  "No pienses, siente. Es como un dedo apuntando a la luna.",
  "Acepta todo tal como es; la resistencia mental es debilidad.",
  "Haz cada cosa en tu entrenamiento como si fuera la última.",
  "Tu vida es lo que tus pensamientos construyen en el silencio del dojo.",
  "Lo que es difícil de soportar, es dulce de recordar al final del camino.",
  "La adversidad introduce a un hombre consigo mismo.",
  "El dojo no tiene paredes; entrena en cada respiración, en cada paso.",
  "Silencio en la mente, fuego en la técnica, titanio en la voluntad.",
  "Ningún árbol se vuelve robusto si no es azotado por el viento de la carga física."
];

// Base de Datos Estructural Híbrida - De Lvl 1 a Lvl 100
const EXERCISE_DB = [
  // --- FUERZA: EMPUJE ---
  { id: "str_1", n: "Empuje de Aprendiz", real: "Flexiones de Rodillas", s: "str", f: "push", lvl_min: 1, lvl_max: 10, t: "reps", domain: "conditioning", baseVal: 5, scale: 0.5, desc: "1. Rodillas apoyadas. 2. Baja el pecho activando tríceps. 3. Empuja recto al cielo.", m: "./img/techniques/str_1.png", alt: null },
  { id: "str_2", n: "Hierro Forjado", real: "Flexiones Clásicas", s: "str", f: "push", lvl_min: 5, lvl_max: 20, t: "reps", domain: "conditioning", baseVal: 8, scale: 0.8, desc: "1. Plancha recta. 2. Codos a 45 grados hacia atrás. Potencia directa de pecho.", m: "./img/techniques/str_2.png", alt: null },
  { id: "str_3", n: "Torre Angular", real: "Pike Pushups", s: "str", f: "push", lvl_min: 15, lvl_max: 35, t: "reps", domain: "conditioning", baseVal: 5, scale: 0.5, desc: "1. Cadera alzada formando una V invertida. 2. Baja la corona de la cabeza adelante de tus manos formando un trípode. Hombros de piedra.", m: "./img/techniques/str_3.png", alt: null },
  { id: "str_4", n: "Diamante Sólido", real: "Flexiones Diamante", s: "str", f: "push", lvl_min: 20, lvl_max: 40, t: "reps", domain: "conditioning", baseVal: 8, scale: 0.6, desc: "1. Trinchera las manos. Enfoque hipertrófico de tríceps, base del Striking.", m: "./img/techniques/str_4.png", alt: null },
  { id: "str_5", n: "Estallido de Dragón", real: "Flexiones Pliométricas", s: "str", f: "push", lvl_min: 30, lvl_max: 55, t: "reps", domain: "conditioning", baseVal: 5, scale: 0.5, desc: "1. Despegue violento y palmada para reclutar fibras rápidas.", m: "./img/techniques/str_5.png", alt: null },
  { id: "str_6", n: "Toque del Arquero", real: "Flexiones Arquero", s: "str", f: "push", lvl_min: 45, lvl_max: 70, t: "reps", domain: "conditioning", baseVal: 6, scale: 0.4, desc: "1. Brazos anchos. Cambia peso unilateral bloqueando un brazo. Balance asimétrico.", m: "./img/techniques/str_6.png", alt: null },
  { id: "str_7", n: "Titán Invertido", real: "Wall Handstand Pushups", s: "str", f: "push", lvl_min: 60, lvl_max: 85, t: "reps", domain: "conditioning", baseVal: 3, scale: 0.3, desc: "1. Parada de manos apoyo. 2. Desciende y empuja 100% peso corporal. Soberanía del hombro.", m: "./img/techniques/str_7.png", alt: null },
  { id: "str_8", n: "Monje de una Mano", real: "Flexión a Una Mano", s: "str", f: "push", lvl_min: 75, lvl_max: 100, t: "reps", domain: "conditioning", baseVal: 3, scale: 0.2, desc: "1. Control de rotación del núcleo absoluto. Empuje lateral extremo.", m: "./img/techniques/str_8.png", alt: null },

  // --- FUERZA: TRACCIÓN ---
  { id: "str_9", n: "Raíces Sumergidas", real: "Remo Invertido Básico", s: "str", f: "pull", lvl_min: 1, lvl_max: 15, t: "reps", domain: "conditioning", baseVal: 8, scale: 0.8, desc: "1. Bajo mesa. Tira pecho a barra/borde retrayendo escápulas.", m: "./img/techniques/str_9.png", alt: null },
  { id: "str_10", n: "Fuerza Creciente", real: "Dominadas Excéntricas", s: "str", f: "pull", lvl_min: 10, lvl_max: 30, t: "reps", domain: "conditioning", baseVal: 4, scale: 0.4, desc: "1. Salta arriba. Resiste la bajada como la muerte.", m: "./img/techniques/str_10.png", alt: null },
  { id: "str_11", n: "Tracción del Tigre", real: "Dominadas Estrictas", s: "str", f: "pull", lvl_min: 20, lvl_max: 50, t: "reps", domain: "conditioning", baseVal: 5, scale: 0.4, desc: "1. Mentón sobre la barra, codos abajo. Control pasivo a activo.", m: "./img/techniques/str_11.png", alt: null },
  { id: "str_12", n: "Tigre Enfurecido", real: "L-Sit Pull-ups", s: "str", f: "pull", lvl_min: 40, lvl_max: 70, t: "reps", domain: "conditioning", baseVal: 4, scale: 0.3, desc: "1. Piernas 90° frente. Aislando dorsales y reventando compresión ilíaca.", m: "./img/techniques/str_12.png", alt: null },
  { id: "str_13", n: "Muro Traspasado", real: "Muscle-Ups Lentos", s: "str", f: "pull", lvl_min: 60, lvl_max: 85, t: "reps", domain: "conditioning", baseVal: 2, scale: 0.2, desc: "1. Domina la transición encima la barra. Unificación Push/Pull.", m: "./img/techniques/str_13.png", alt: null },
  { id: "str_14", n: "Voluntad de Dioses", real: "Dominada Uno Brazo (OAP)", s: "str", f: "pull", lvl_min: 80, lvl_max: 100, t: "reps", domain: "conditioning", baseVal: 1, scale: 0.1, desc: "1. Cero kipping. Todo el peso dominado por un sólo lado de tu espalda.", m: "./img/techniques/str_14.png", alt: null },

  // --- FUERZA: PIERNAS ---
  { id: "str_15", n: "Paso Fundamental", real: "Sentadillas Libres", s: "str", f: "legs", lvl_min: 1, lvl_max: 15, t: "reps", domain: "conditioning", baseVal: 15, scale: 1.0, desc: "1. Quiebra el paralelo. Rodillas alineadas a pies.", m: "./img/techniques/str_16.png", alt: null },
  { id: "str_16", n: "Zancada Guerrera", real: "Split Squat Estricto", s: "str", f: "legs", lvl_min: 10, lvl_max: 25, t: "reps", domain: "conditioning", baseVal: 12, scale: 0.8, desc: "1. Descenso asimétrico de carga frontal.", m: "./img/techniques/str_17.png", alt: null },
  { id: "str_17", n: "Gravedad Dividida", real: "Sentadilla Búlgara", s: "str", f: "legs", lvl_min: 20, lvl_max: 45, t: "reps", domain: "conditioning", baseVal: 10, scale: 0.6, desc: "1. Pie trasero elevado. Rango profundo glúteo-femoral.", m: "./img/techniques/str_18.png", alt: null },
  { id: "str_18", n: "Flecha de Rodilla", real: "Sissy Squats", s: "str", f: "legs", lvl_min: 35, lvl_max: 65, t: "reps", domain: "conditioning", baseVal: 8, scale: 0.5, desc: "1. Deja caer el torso como bloque hacia atrás doblando en rodilla (puntillas). Elévate. Refuerza cartílago.", m: "./img/techniques/str_19.png", alt: null },
  { id: "str_19", n: "Pilar Inferior", real: "Pistol Squat Puro", s: "str", f: "legs", lvl_min: 50, lvl_max: 85, t: "reps", domain: "conditioning", baseVal: 4, scale: 0.3, desc: "1. Profundo a 1 pierna, isquio besando el talón.", m: "./img/techniques/str_20.png", alt: null },
  { id: "str_20", n: "Dragón Oculto", real: "Dragon Pistols", s: "str", f: "legs", lvl_min: 70, lvl_max: 100, t: "reps", domain: "conditioning", baseVal: 3, scale: 0.2, desc: "1. Cruza pie detrás como gancho isométrico. Destreza y tendones inquebrantables.", m: "./img/techniques/str_21.png", alt: null },

  // --- VELOCIDAD / CARDIO Y CRAWLS (ANIMALES) ---
  { id: "spd_1", n: "Sombra Guerrera", real: "Boxeo de Sombra (Lento/Técnico)", s: "spd", f: "cardio", lvl_min: 1, lvl_max: 20, t: "time", domain: "conditioning", baseVal: 45, scale: 1.5, desc: "1. Muévete puliendo los fundamentales, jab cruzado y esquive ligero.", m: "./img/techniques/spd_1.png", alt: null },
  { id: "spd_2", n: "Viento Cruzado", real: "Mountain Climbers", s: "spd", f: "cardio", lvl_min: 10, lvl_max: 35, t: "time", domain: "conditioning", baseVal: 30, scale: 1.5, desc: "1. Alta explosividad pélvica en base de plancha.", m: "./img/techniques/spd_2.png", alt: null },
  { id: "spd_3", n: "Sendero del Oso", real: "Bear Crawls Lentos", s: "spd", f: "cardio", lvl_min: 15, lvl_max: 40, t: "time", domain: "conditioning", baseVal: 35, scale: 1.0, desc: "1. 4 apoyos con rodillas flotantes a 5cm del piso. Camina activando hombro y lumbares.", m: "./img/techniques/spd_3.png", alt: null },
  { id: "spd_4", n: "Defensa Cíclica", real: "Crab Walks", s: "spd", f: "cardio", lvl_min: 25, lvl_max: 50, t: "time", domain: "conditioning", baseVal: 30, scale: 1.2, desc: "1. Apoyo inverso. Levanta la pelvis y avanza. Lubricación de hombro trasero, fortaleciendo muñecas.", m: "./img/techniques/spd_4.png", alt: null },
  { id: "spd_5", n: "Defensa Mortal", real: "Burpees Marciales", s: "spd", f: "cardio", lvl_min: 30, lvl_max: 65, t: "reps", domain: "conditioning", baseVal: 10, scale: 0.8, desc: "1. Caida a pecho en tierra, empuje y salto vertical.", m: "./img/techniques/spd_5.png", alt: null },
  { id: "spd_6", n: "Patada Evasiva", real: "Sit Throughs / Grappler Drills", s: "spd", f: "cardio", lvl_min: 40, lvl_max: 75, t: "reps", domain: "conditioning", baseVal: 14, scale: 0.8, desc: "1. Desde Oso, lanza la pierna girando para defender derribos. Core lateral al 100%.", m: "./img/techniques/spd_6.png", alt: null },
  { id: "spd_7", n: "Acecho Cocodrilo", real: "Spiderman Walks Flotantes", s: "spd", f: "cardio", lvl_min: 55, lvl_max: 85, t: "time", domain: "conditioning", baseVal: 30, scale: 1.0, desc: "1. Arrastre de cuerpo pecho rozando suelo acercando rodillas a codos. El infierno cardio.", m: "./img/techniques/spd_7.png", alt: null },
  { id: "spd_8", n: "Salto del Guepardo", real: "Tuck Jumps Continuos", s: "spd", f: "cardio", lvl_min: 65, lvl_max: 90, t: "time", domain: "conditioning", baseVal: 20, scale: 1.5, desc: "1. Salto Vertical violento llevando rodillas agrupadas. Cae elástico y repite sin trabar.", m: "./img/techniques/spd_8.png", alt: null },
  { id: "spd_9", n: "Asalto Fantasma", real: "Burpees Monopodales (1 Pierna)", s: "spd", f: "cardio", lvl_min: 80, lvl_max: 100, t: "reps", domain: "conditioning", baseVal: 8, scale: 0.5, desc: "1. Un pie en el aire siempre. Flexión asimétrica y salto de la muerte.", m: "./img/techniques/spd_9.png", alt: null },

  // --- ENDURANCE: CORE DINÁMICO & ISOMÉTRICO GENERAL ---
  { id: "end_1", n: "Centro Pasivo", real: "Plancha Apoyando Rodillas", s: "end", f: "core", lvl_min: 1, lvl_max: 10, t: "time", domain: "conditioning", baseVal: 30, scale: 2.0, desc: "1. Aprieta el glúteo bloqueando la retroversión pélvica.", m: "./img/techniques/end_1.png", alt: null },
  { id: "end_2", n: "Fortaleza Viva", real: "Plancha Clásica Estricta", s: "end", f: "core", lvl_min: 5, lvl_max: 25, t: "time", domain: "conditioning", baseVal: 40, scale: 1.5, desc: "1. Sube muslos, activa dorsales y aplasta ombligo a la columna.", m: "./img/techniques/end_2.png", alt: null },
  { id: "end_3", n: "Core de Hierro", real: "Hollow Body Hold", s: "end", f: "core", lvl_min: 15, lvl_max: 40, t: "time", domain: "conditioning", baseVal: 30, scale: 1.2, desc: "1. Clava fuerte la zona lumbar, brazos/piernas elevados sin curvar.", m: "./img/techniques/end_3.png", alt: null },
  { id: "end_4", n: "Paso Pantano", real: "Elevación Piernas", s: "end", f: "core", lvl_min: 25, lvl_max: 50, t: "reps", domain: "conditioning", baseVal: 15, scale: 0.5, desc: "1. Recto en piso. Suspende hasta 45 grados y baja sin tocar. Flexor pélvico al rojo vivo.", m: "./img/techniques/end_4.png", alt: null },
  { id: "end_5", n: "Defensa Bivalva", real: "V-Ups Abdominales", s: "end", f: "core", lvl_min: 40, lvl_max: 65, t: "reps", domain: "conditioning", baseVal: 10, scale: 0.4, desc: "1. Pliega dinámicamente torso/piernas contactando arriba violentamente.", m: "./img/techniques/end_5.png", alt: null },
  { id: "end_6", n: "Bandera Dragón", real: "Dragon Flags", s: "end", f: "core", lvl_min: 60, lvl_max: 85, t: "reps", domain: "conditioning", baseVal: 5, scale: 0.3, desc: "1. Fija tus manos a un ancla superior. Exhala suspendiendo tu cuerpo rectilíneo desde hombros.", m: "./img/techniques/end_6.png", alt: null },
  { id: "end_7", n: "Levitación Core", real: "L / V-Sit Suelo", s: "end", f: "core", lvl_min: 80, lvl_max: 100, t: "time", domain: "conditioning", baseVal: 10, scale: 0.8, desc: "1. Eleva pies sentado en paraletas / suelo aplicando compresión pura de cadera.", m: "./img/techniques/end_7.png", alt: null },

  // --- ENDURANCE: CUELLO & CADENA POSTERIOR (Lucha) ---
  { id: "end_8", n: "Pétalo Dorado", real: "Superman Hold", s: "end", f: "neck", lvl_min: 1, lvl_max: 30, t: "time", domain: "conditioning", baseVal: 30, scale: 1.5, desc: "1. Boca abajo. Carga glúteos/espina suspendiendo extremidades. Higiene discal.", m: "./img/techniques/end_8.png", alt: null },
  { id: "end_9", n: "Puente Lucha Básico", real: "Wrestler Static Bridge Libre", s: "end", f: "neck", lvl_min: 30, lvl_max: 65, t: "time", domain: "conditioning", baseVal: 20, scale: 1.0, desc: "1. Apóyate en pies y coronilla (si no tienes exp, usa las manos un poco). Engrosa cervicales previendo impactos a cráneo.", m: "./img/techniques/end_9.png", alt: null },
  { id: "end_10", n: "Puente Combate Oscilado", real: "Dynamic Wrestler Bridge Rolls", s: "end", f: "neck", lvl_min: 60, lvl_max: 100, t: "reps", domain: "conditioning", baseVal: 10, scale: 0.5, desc: "1. En Puente, rueda lentamente peso de frente a coronilla absorbiendo shock torsional. Sólo Maestros Avanzados.", m: "./img/techniques/end_10.png", alt: null },

  // --- ENDURANCE: ISÓMETRICOS PIERNAS (Ma Bu) ---
  { id: "end_11", n: "Enraizamiento Base", real: "Ma Bu Alta (Kiba Dachi Cúspide)", s: "end", f: "iso_legs", lvl_min: 1, lvl_max: 30, t: "time", domain: "conditioning", baseVal: 40, scale: 1.5, desc: "1. Isometría abierta leve. Cultiva mente, solidificando rodilla lateralmente sin estrés profundo.", m: "./img/techniques/end_11.png", alt: null },
  { id: "end_12", n: "Muralla Inquebrantable", real: "Wall Sit", s: "end", f: "iso_legs", lvl_min: 20, lvl_max: 60, t: "time", domain: "conditioning", baseVal: 45, scale: 1.5, desc: "1. 90 Grados rígidos hundidos a un muro. Bloquea cuádricep quemando el lactato.", m: "./img/techniques/end_12.png", alt: null },
  { id: "end_13", n: "Roble del Sensei", real: "Ma Bu Profundo (Shaolin Stance)", s: "end", f: "iso_legs", lvl_min: 50, lvl_max: 100, t: "time", domain: "conditioning", baseVal: 40, scale: 1.0, desc: "1. Postura de Jinete pura por debajo paralelo. Cientos de años de templamiento mental marcial en isometría solitaria.", m: "./img/techniques/end_13.png", alt: null },

  // --- FLEXIBILIDAD UPPER ---
  { id: "flex_1", n: "Corriente de Agua", real: "Gato / Camello Pélvico", s: "flex", f: "upper", lvl_min: 1, lvl_max: 30, t: "reps", domain: "mobility", baseVal: 15, scale: 0.5, desc: "1. Articular vértebras lentamente oxigenando discos en cuadrupedia.", m: "./img/techniques/flex_1.png", alt: null },
  { id: "flex_2", n: "Ennebrado Espiral", real: "Torsión Thread The Needle", s: "flex", f: "upper", lvl_min: 15, lvl_max: 50, t: "time", domain: "mobility", baseVal: 40, scale: 1.0, desc: "1. Torsión extrema de espalda, aplasta deltoide a piso descomprimiendo zona T.", m: "./img/techniques/flex_2.png", alt: null },
  { id: "flex_3", n: "Punzón Veneno", real: "Escorpión Abierto Supino", s: "flex", f: "upper", lvl_min: 30, lvl_max: 70, t: "time", domain: "mobility", baseVal: 35, scale: 1.0, desc: "1. Estiramiento dinámico Pectoral-Cadera forzando pie opuesto tras espalda.", m: "./img/techniques/flex_3.png", alt: null },
  { id: "flex_4", n: "Hojas Guillotina", real: "Dislocaciones Completas Palo/Toalla", s: "flex", f: "upper", lvl_min: 50, lvl_max: 100, t: "reps", domain: "mobility", baseVal: 15, scale: 0.3, desc: "1. Pasa ambos brazos rectos sin quebrar codo atrás y retorna. Salva todo desgarre de hombro preventivamente.", m: "./img/techniques/flex_4.png", alt: null },

  // --- FLEXIBILIDAD LOWER ---
  { id: "flex_5", n: "Cauce Blando", real: "Plegado Asistido Frente Libre", s: "flex", f: "lower", lvl_min: 1, lvl_max: 30, t: "time", domain: "mobility", baseVal: 45, scale: 1.0, desc: "1. Relaja la cintura arrojando el peso adelante sintiendo aflojar fascia posterior simple.", m: "./img/techniques/flex_5.png", alt: null },
  { id: "flex_6", n: "Reposo Cauteloso", real: "Zancada Psoas Pasivo Lunge", s: "flex", f: "lower", lvl_min: 10, lvl_max: 40, t: "time", domain: "mobility", baseVal: 40, scale: 1.0, desc: "1. Abre flexor ilíaco profundo hundiéndote hacia rodilla delantera frontal.", m: "./img/techniques/flex_6.png", alt: null },
  { id: "flex_7", n: "Rana en Estanque", real: "Frog Pose", s: "flex", f: "lower", lvl_min: 25, lvl_max: 60, t: "time", domain: "mobility", baseVal: 40, scale: 1.0, desc: "1. Aísla aductores abriendo rodillas transversal sintiendo un 60% peso hundiéndose directo al pubis.", m: "./img/techniques/flex_7.png", alt: null },
  { id: "flex_8", n: "Sauce en el Río", real: "Pike Stretch V-Sit", s: "flex", f: "lower", lvl_min: 40, lvl_max: 75, t: "time", domain: "mobility", baseVal: 40, scale: 1.0, desc: "1. Compresión isquio intensa sentados intentando rozar barbilla espinilla pura sin encorvar tanto.", m: "./img/techniques/flex_8.png", alt: null },
  { id: "flex_9", n: "Espada Tijera Front", real: "Spagat Frontal", s: "flex", f: "lower", lvl_min: 60, lvl_max: 90, t: "time", domain: "mobility", baseVal: 35, scale: 1.0, desc: "1. Split estricto forzando Psoas trasero y femoral delante logrando estática marcial coreana.", m: "./img/techniques/flex_9.png", alt: null },
  { id: "flex_10", n: "Abanico Sol", real: "Spagat Lateral Middle Split Max", s: "flex", f: "lower", lvl_min: 80, lvl_max: 100, t: "time", domain: "mobility", baseVal: 30, scale: 1.0, desc: "1. El Rey Absoluto. Las rodillas ceden al ras del suelo forjando tendones de Acrílico Balístico.", m: "./img/techniques/flex_10.png", alt: null }
];
