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
  "El sudor es la tinta con la que escribes tu leyenda."
];

// Base de Datos Estructural
const EXERCISE_DB = [
  // FUERZA (STR) - Acondicionamiento Físico
  {
    id: "str_1",
    n: "Garra de Oso",
    real: "Flexiones con Torsión (T-Pushup)",
    s: "str",
    lvl_min: 1,
    lvl_max: 30,
    t: "reps",
    domain: "conditioning",
    baseVal: 6,
    scale: 0.5,
    desc: "1. Haz una flexión clásica. 2. Al subir, gira el torso y levanta un brazo al cielo. 3. Vuelve y repite al otro lado. Excelente para fuerza de empuje y estabilidad rotacional de striking.",
    m: "https://c.tenor.com/gI-8qCUEko8AAAAC/pushup.gif",
    alt: {
      n: "Fuerza Parcial",
      real: "Flexiones de Rodilla",
      desc: "Apoya las rodillas si no logras completar la técnica estricta completa."
    }
  },
  {
    id: "str_2",
    n: "Estallido de Dragón",
    real: "Flexiones Pliométricas (Aplauso)",
    s: "str",
    lvl_min: 15,
    lvl_max: 100,
    t: "reps",
    domain: "conditioning",
    baseVal: 5,
    scale: 0.4,
    desc: "1. Baja controladamente. 2. Empuja el suelo tan explosivamente que tus manos se despeguen. 3. Aplaude y aterriza suave. Genera potencia de golpeo.",
    m: "https://c.tenor.com/gI-8qCUEko8AAAAC/pushup.gif",
    alt: null
  },
  {
    id: "str_3",
    n: "Tracción del Tigre",
    real: "Retracción Escapular y Dominadas",
    s: "str",
    lvl_min: 5,
    lvl_max: 100,
    t: "reps",
    domain: "conditioning",
    baseVal: 3,
    scale: 0.3,
    desc: "1. Cuélgate de la barra. 2. Empieza el movimiento retrayendo activamente las escápulas. 3. Tira hasta que la barbilla pase la barra. Clave para el control en el clinch y grappling.",
    m: "https://c.tenor.com/bK1G0fQ1QfEAAAAC/bodybuilding-pullups.gif",
    alt: {
      n: "Agarre Terrenal",
      real: "Remo Invertido bajo Mesa",
      desc: "NO TENGO BARRA: Métete bajo una mesa firme, agarra su borde y tira tu pecho hacia la mesa para trabajar la espalda."
    }
  },
  {
    id: "str_4",
    n: "Pilar Inferior",
    real: "Pistol Squats (Sentadilla 1 Pierna)",
    s: "str",
    lvl_min: 30,
    lvl_max: 100,
    t: "reps",
    domain: "conditioning",
    baseVal: 2,
    scale: 0.2, 
    desc: "1. Levanta una pierna y baja el peso sobre la otra. Fuerza extrema de tren inferior necesaria para pateos altos estables y derribos.",
    m: "https://c.tenor.com/XqU774900m0AAAAC/pistol-squat-squat.gif",
    alt: {
      n: "Pilar Asistido",
      real: "Sentadilla Búlgara",
      desc: "Apoya el empeine de una pierna atrás sobre una silla o sofá y baja sostenidamente con la pierna delantera."
    }
  },

  // RAPIDEZ / POTENCIA (SPD) - Acondicionamiento Físico
  {
    id: "spd_1",
    n: "Defensa Mortal",
    real: "Sprawls",
    s: "spd",
    lvl_min: 1,
    lvl_max: 100,
    t: "reps",
    domain: "conditioning",
    baseVal: 10,
    scale: 1.0,
    desc: "1. Empieza en guardia. 2. Arroja las caderas pesadas al piso como evitando un derribo (takedown). 3. Vuelve rápido a ponerte en guardia.",
    m: "https://c.tenor.com/_qZ3B7tA45wAAAAC/burpee-exercise.gif",
    alt: null
  },
  {
    id: "spd_2",
    n: "Carga de Rinoceronte",
    real: "Saltos de Rana Explosivos (Squat Jumps)",
    s: "spd",
    lvl_min: 5,
    lvl_max: 100,
    t: "reps",
    domain: "conditioning",
    baseVal: 10,
    scale: 0.8,
    desc: "1. Baja a una sentadilla profunda. 2. Salta al cielo con máxima hiper-extensión de la cadera. 3. Aterriza absorbiendo impacto.",
    m: "https://c.tenor.com/XqU774900m0AAAAC/pistol-squat-squat.gif",
    alt: null
  },
  {
    id: "spd_3",
    n: "Furia del Viento",
    real: "Mountain Climbers (Escaladores Veloces)",
    s: "spd",
    lvl_min: 1,
    lvl_max: 100,
    t: "time",
    domain: "conditioning",
    baseVal: 20,
    scale: 1.5,
    desc: "1. Postura de flexión. 2. Lleva las rodillas al pecho alternando sin levantar demasiado el glúteo. Cardio intenso puro.",
    m: "https://c.tenor.com/O6Y4d5q9xLIAAAAC/mountain-climbers.gif",
    alt: null
  },

  // RESISTENCIA / AGUANTE (END) - Acondicionamiento Físico
  {
    id: "end_1",
    n: "Core de Hierro",
    real: "Hollow Body Rock",
    s: "end",
    lvl_min: 1,
    lvl_max: 100,
    t: "time",
    domain: "conditioning",
    baseVal: 20,
    scale: 1.0,
    desc: "1. Acuéstate y levanta brazos y piernas. 2. Presiona la zona lumbar FUERTE contra el piso. 3. Balancéate levemente manteniendo el bloque de hierro del abdomen.",
    m: "https://c.tenor.com/mOPEt9U_F4gAAAAC/hollow-hold.gif",
    alt: null
  },
  {
    id: "end_2",
    n: "Muralla Inquebrantable",
    real: "Sentadilla Isométrica (Wall Sit)",
    s: "end",
    lvl_min: 5,
    lvl_max: 100,
    t: "time",
    domain: "conditioning",
    baseVal: 30,
    scale: 1.5,
    desc: "1. Apoya tu espalda en la pared. 2. Desciende formando 90 grados con las rodillas. 3. Resiste el dolor isométrico para robustecer ligamentos.",
    m: "https://c.tenor.com/O67hP3sEbwMAAAAC/squat-wall-sit.gif",
    alt: null
  },
  {
    id: "end_3",
    n: "Defensa Terrestre",
    real: "Puente Glúteo y Cuello Isométrico",
    s: "end",
    lvl_min: 15,
    lvl_max: 100,
    t: "time",
    domain: "conditioning",
    baseVal: 20,
    scale: 1.0,
    desc: "1. Acuéstate de espaldas. 2. Clava los talones. 3. Eleva la cadera activando glúteo. 4. Apoya parte del peso sutilmente en la parte alta de la espalda sin dañar las cervicales para fortalecer postura.",
    m: "https://c.tenor.com/oK8bY9wF7oMAAAAC/yoga-bridge.gif",
    alt: null
  },

  // FLEXIBILIDAD (FLEX) - Rutina de Movilidad y Recuperación Diaria
  {
    id: "flex_1",
    n: "Apertura de Loto Frontal",
    real: "Pancake Stretch",
    s: "flex",
    lvl_min: 1,
    lvl_max: 100,
    t: "time",
    domain: "mobility",
    baseVal: 30,
    scale: 1.0,
    desc: "1. Siéntate abriendo las piernas lo máximo posible (Straddle). 2. Inclina el torso hacia adelante relajando la zona lumbar. 3. Respira y baja unos milímetros cada vez.",
    m: "https://c.tenor.com/7L4C0E3jS2kAAAAC/stretching-exercise.gif",
    alt: null
  },
  {
    id: "flex_2",
    n: "Paso de Mantis",
    real: "Lunge Profundo Spiderman",
    s: "flex",
    lvl_min: 1,
    lvl_max: 100,
    t: "time",
    domain: "mobility",
    baseVal: 30,
    scale: 0.8,
    desc: "1. Da una zancada bien amplia. 2. Apoya ambas manos por el interior del pie adelantado. 3. Hunde la pelvis y estira los flexores de cadera (Psoas).",
    m: "https://c.tenor.com/XwS09QnB9_AAAAAC/stretching.gif",
    alt: null
  },
  {
    id: "flex_3",
    n: "Postura del Cisne Descansando",
    real: "Yoga Pigeon Pose",
    s: "flex",
    lvl_min: 5,
    lvl_max: 100,
    t: "time",
    domain: "mobility",
    baseVal: 40,
    scale: 1.2,
    desc: "1. Dobla una pierna cruzándola por delante de ti en el suelo. 2. Extiende la pierna trasera totalmente recta. 3. Acuéstate sobre la pierna flexionada para estirar la banda IT y el glúteo en profundidad.",
    m: "https://c.tenor.com/oK8bY9wF7oMAAAAC/yoga-bridge.gif",
    alt: null
  },
  {
    id: "flex_4",
    n: "Rotación de lanza",
    real: "Dislocaciones Articulares de Hombro",
    s: "flex",
    lvl_min: 1,
    lvl_max: 100,
    t: "reps",
    domain: "mobility",
    baseVal: 15,
    scale: 0.5,
    desc: "1. Agarra una toalla, banda elástica o palo de escoba bien amplio. 2. Pásalo desde la cintura adelante, por encima de tu cabeza, hasta la espalda baja sin doblar codos. Vital para movilidad de hombros.",
    m: "https://c.tenor.com/7L4C0E3jS2kAAAAC/stretching-exercise.gif",
    alt: {
      n: "Estiramiento Inactivo",
      real: "Tracción en Puerta",
      desc: "Pon el antebrazo a 90 grados contra el marco de una puerta y gira tu torso alejándote para abrir el pectoral."
    }
  },
  {
    id: "flex_5",
    n: "Giro de Serpiente",
    real: "Estiramiento del Escorpión",
    s: "flex",
    lvl_min: 5,
    lvl_max: 100,
    t: "time",
    domain: "mobility",
    baseVal: 30,
    scale: 0.8,
    desc: "1. Acuéstate boca abajo, brazos en cruz (T). 2. Levanta una pierna doblando rodilla, pásala sobre tu espalda para tocar el suelo al lado opuesto. Descomprime la zona lumbar.",
    m: "https://c.tenor.com/XwS09QnB9_AAAAAC/stretching.gif",
    alt: null
  }
];
