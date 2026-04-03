// database.js
// ALGORITMO DE INTELIGENCIA DE CALISTENIA (V6 MAX 100)

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
  // FUERZA (STR)
  {
    id: "str_1",
    n: "Garra de Oso",
    real: "Flexiones en Pared",
    s: "str",
    lvl_min: 1,
    lvl_max: 5,
    t: "reps",
    baseVal: 8,
    scale: 1.5,
    desc: "1. Párate frente a la pared. 2. Apoya las palmas planas. 3. Flexiona codos y empuja.",
    m: "https://c.tenor.com/gI-8qCUEko8AAAAC/pushup.gif",
    alt: null
  },
  {
    id: "str_2",
    n: "Embestida de Toro",
    real: "Flexiones de Rodillas",
    s: "str",
    lvl_min: 3,
    lvl_max: 15,
    t: "reps",
    baseVal: 6,
    scale: 0.8,
    desc: "1. Apoya rodillas en el suelo. 2. Manos ancho de hombros. 3. Baja el pecho y empuja fuerte.",
    m: "https://c.tenor.com/gI-8qCUEko8AAAAC/pushup.gif",
    alt: null
  },
  {
    id: "str_3",
    n: "Golpe de Hierro",
    real: "Flexiones Clásicas",
    s: "str",
    lvl_min: 10,
    lvl_max: 100,
    t: "reps",
    baseVal: 10,
    scale: 0.5,
    desc: "1. Cuerpo recto como una tabla. 2. Baja hasta rozar el suelo. 3. Extiende codos completamente.",
    m: "https://c.tenor.com/gI-8qCUEko8AAAAC/pushup.gif",
    alt: null
  },
  {
    id: "str_4",
    n: "Elevación del Dragón",
    real: "Dominadas Clásicas (Pull-ups)",
    s: "str",
    lvl_min: 20,
    lvl_max: 100,
    t: "reps",
    baseVal: 3,
    scale: 0.3,
    desc: "1. Cuelga de la barra. 2. Retrae escápulas. 3. Sube la barbilla por encima de las manos.",
    m: "https://c.tenor.com/bK1G0fQ1QfEAAAAC/bodybuilding-pullups.gif",
    alt: {
      n: "Fuerza Terrenal",
      real: "Remo Invertido bajo Mesa",
      desc: "NO TENGO BARRA: 1. Métete bajo una mesa firme. 2. Agarra el borde grueso. 3. Tira de tu pecho hacia la mesa."
    }
  },
  {
    id: "str_5",
    n: "Pilar de Obsidiana",
    real: "Pistol Squats (Sentadilla a una pierna)",
    s: "str",
    lvl_min: 40,
    lvl_max: 100,
    t: "reps",
    baseVal: 2,
    scale: 0.2, // Difícil de escalar
    desc: "1. Levanta una pierna al frente. 2. Baja tu peso sobre la otra pierna. 3. Sube concentrando la fuerza en el glúteo.",
    m: "https://c.tenor.com/XqU774900m0AAAAC/pistol-squat-squat.gif",
    alt: null
  },

  // RAPIDEZ (SPD)
  {
    id: "spd_1",
    n: "Viento Cruzado",
    real: "Jumping Jacks",
    s: "spd",
    lvl_min: 1,
    lvl_max: 100,
    t: "time",
    baseVal: 20,
    scale: 1.2,
    desc: "1. Salta abriendo piernas. 2. Sube los brazos sobre la cabeza. 3. Cierra rápido.",
    m: "https://c.tenor.com/_qZ3B7tA45wAAAAC/burpee-exercise.gif",
    alt: null
  },
  {
    id: "spd_2",
    n: "Pasos de Tigre",
    real: "Mountain Climbers (Escaladores)",
    s: "spd",
    lvl_min: 5,
    lvl_max: 100,
    t: "time",
    baseVal: 20,
    scale: 1.5,
    desc: "1. Postura de flexión. 2. Lleva las rodillas al pecho alternando. 3. Acelera el ritmo sin elevar la pelvis.",
    m: "https://c.tenor.com/O6Y4d5q9xLIAAAAC/mountain-climbers.gif",
    alt: null
  },
  {
    id: "spd_3",
    n: "Estallido de Fénix",
    real: "Burpees",
    s: "spd",
    lvl_min: 15,
    lvl_max: 100,
    t: "reps",
    baseVal: 5,
    scale: 0.4,
    desc: "1. Tírate al pecho suelo. 2. Recoge las piernas rápido. 3. Salta explosivo hacia el cielo.",
    m: "https://c.tenor.com/_qZ3B7tA45wAAAAC/burpee-exercise.gif",
    alt: null
  },

  // FLEXIBILIDAD (FLEX)
  {
    id: "flex_1",
    n: "Bambú Inclinado",
    real: "Tocar Punta de Pies de Pie",
    s: "flex",
    lvl_min: 1,
    lvl_max: 100,
    t: "time",
    baseVal: 20,
    scale: 1,
    desc: "1. Rodillas bloqueadas rectas. 2. Baja el torso lentamente. 3. Intenta tocar el piso y respira.",
    m: "https://c.tenor.com/7L4C0E3jS2kAAAAC/stretching-exercise.gif",
    alt: null
  },
  {
    id: "flex_2",
    n: "Postura de Mantis",
    real: "Lunge Profundo (Spiderman Stretch)",
    s: "flex",
    lvl_min: 5,
    lvl_max: 100,
    t: "time",
    baseVal: 30,
    scale: 0.8,
    desc: "1. Zancada amplia. 2. Apoya las manos dentro del pie adelantado. 3. Hunde la cadera hacia el piso.",
    m: "https://c.tenor.com/XwS09QnB9_AAAAAC/stretching.gif",
    alt: null
  },
  {
    id: "flex_3",
    n: "Grulla Invertida",
    real: "Puente (Backbend)",
    s: "flex",
    lvl_min: 25,
    lvl_max: 100,
    t: "time",
    baseVal: 15,
    scale: 0.5,
    desc: "1. Acuéstate y apoya manos junto a orejas. 2. Empuja pelvis al techo. 3. Extiende codos completamente.",
    m: "https://c.tenor.com/oK8bY9wF7oMAAAAC/yoga-bridge.gif",
    alt: null
  },

  // RESISTENCIA / AGUANTE (END)
  {
    id: "end_1",
    n: "Estatua de Piedra",
    real: "Plancha Abdominal Alta",
    s: "end",
    lvl_min: 1,
    lvl_max: 20,
    t: "time",
    baseVal: 15,
    scale: 1.5,
    desc: "1. Apoya palmas y puntas de pies. 2. Mete el abdomen. 3. Aprieta glúteos y respira profundo.",
    m: "https://c.tenor.com/Z421O2c-2GIAAAAC/plank-exercise.gif",
    alt: null
  },
  {
    id: "end_2",
    n: "Escudo Tortuga",
    real: "Hollow Body Hold",
    s: "end",
    lvl_min: 10,
    lvl_max: 100,
    t: "time",
    baseVal: 15,
    scale: 1,
    desc: "1. Acuéstate boca arriba. 2. Levanta piernas y hombros despegando la espalda alta. 3. La zona lumbar JAMÁS se despega del piso.",
    m: "https://c.tenor.com/mOPEt9U_F4gAAAAC/hollow-hold.gif",
    alt: null
  },
  {
    id: "end_3",
    n: "Muralla Inquebrantable",
    real: "Sentadilla Isométrica en Pared (Wall Sit)",
    s: "end",
    lvl_min: 10,
    lvl_max: 100,
    t: "time",
    baseVal: 30,
    scale: 1.5,
    desc: "1. Apoya tu espalda en la pared. 2. Desciende hasta formar 90 grados con rodillas. 3. Aguanta el ardor.",
    m: "https://c.tenor.com/O67hP3sEbwMAAAAC/squat-wall-sit.gif",
    alt: null
  }
];
