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

// Base de Datos Estructural - De Lvl 1 a Lvl 100
const EXERCISE_DB = [

  // =========================================================
  // FUERZA Y POTENCIA (STR) - TREN SUPERIOR (EMPUJE)
  // =========================================================
  {
    id: "str_1", n: "Empuje de Aprendiz", real: "Flexiones de Rodillas",
    s: "str", lvl_min: 1, lvl_max: 5, t: "reps", domain: "conditioning",
    baseVal: 5, scale: 0.5,
    desc: "1. Apoya las rodillas en el piso. 2. Mantén la espalda recta alineada con los muslos. 3. Desciende hasta tocar el piso y empuja de regreso. Control absoluto.",
    m: "./img/techniques/str_1.png", alt: null
  },
  {
    id: "str_2", n: "Hierro Forjado", real: "Flexiones Clásicas",
    s: "str", lvl_min: 3, lvl_max: 15, t: "reps", domain: "conditioning",
    baseVal: 8, scale: 0.8,
    desc: "1. Posición de plancha. 2. Baja el pecho hasta el suelo, codos apuntando en diagonal hacia atrás. 3. Empuja usando el pecho y tríceps.",
    m: "./img/techniques/str_2.png", alt: null
  },
  {
    id: "str_3", n: "Garra de Oso", real: "Flexiones con Torsión (T-Pushup)",
    s: "str", lvl_min: 10, lvl_max: 25, t: "reps", domain: "conditioning",
    baseVal: 8, scale: 0.6,
    desc: "1. Haz una flexión clásica. 2. Al subir, gira el torso y levanta un brazo al cielo (T). Excelente para estabilidad rotacional de striking.",
    m: "./img/techniques/str_3.png", alt: null
  },
  {
    id: "str_4", n: "Diamante Sólido", real: "Flexiones de Diamante",
    s: "str", lvl_min: 15, lvl_max: 35, t: "reps", domain: "conditioning",
    baseVal: 10, scale: 0.8,
    desc: "1. Junta las manos debajo del pecho formando un rombo. 2. Enfoque extremo en los tríceps. Potencia directamente al jab y cruzado.",
    m: "./img/techniques/str_4.png", alt: null
  },
  {
    id: "str_5", n: "Estallido de Dragón", real: "Flexiones Pliométricas (Aplauso)",
    s: "str", lvl_min: 20, lvl_max: 40, t: "reps", domain: "conditioning",
    baseVal: 8, scale: 0.5,
    desc: "1. Baja lento. 2. Empuja tan explosivo que tus manos se despeguen. 3. Da una palmada y aterriza suave absorbiendo impacto.",
    m: "./img/techniques/str_5.png", alt: null
  },
  {
    id: "str_6", n: "Toque del Arquero", real: "Flexiones de Arquero",
    s: "str", lvl_min: 35, lvl_max: 60, t: "reps", domain: "conditioning",
    baseVal: 6, scale: 0.4,
    desc: "1. Manos más anchas que los hombros. 2. Desplaza tu peso hacia un lado mientras estiras por completo el brazo opuesto. Un brazo asiste, el otro carga el peso.",
    m: "./img/techniques/str_6.png", alt: null
  },
  {
    id: "str_7", n: "Monje de una Mano", real: "Flexiones a Una Mano Estrictas",
    s: "str", lvl_min: 55, lvl_max: 80, t: "reps", domain: "conditioning",
    baseVal: 3, scale: 0.3,
    desc: "1. Abre mucho las piernas. Una mano en la espalda. 2. Tensión máxima en core y glúteos. 3. Baja y sube empujando tu masa con un solo brazo.",
    m: "./img/techniques/str_7.png", alt: null
  },
  {
    id: "str_8", n: "Vuelo Estático", real: "Pseudo-Planche Push-ups",
    s: "str", lvl_min: 75, lvl_max: 100, t: "reps", domain: "conditioning",
    baseVal: 5, scale: 0.3,
    desc: "1. Apoya las manos a la altura de la cadera o estómago con los dedos hacia atrás. 2. Inclínate hacia adelante. 3. Empuja. Fuerza masiva en hombros rectos.",
    m: "./img/techniques/str_8.png", alt: null
  },

  // =========================================================
  // FUERZA Y POTENCIA (STR) - TREN SUPERIOR (TRACCIÓN)
  // =========================================================
  {
    id: "str_9", n: "Raíces Sumergidas", real: "Remo Invertido Básico",
    s: "str", lvl_min: 1, lvl_max: 10, t: "reps", domain: "conditioning",
    baseVal: 8, scale: 0.8,
    desc: "1. Usando el borde de una mesa firme o toallas enganchadas. 2. Cuerpo estirado hacia arriba. 3. Retrae escápulas y tira tu pecho hacia la mesa.",
    m: "./img/techniques/str_9.png", 
    alt: { n: "Tracción Isométrica", real: "Tirón con Toalla contra Pared", desc: "No tienes cómo jalar: Usa una toalla enganchada en un pilar para hacer tensión isométrica al jalar." }
  },
  {
    id: "str_10", n: "Fuerza Creciente", real: "Dominadas Excéntricas o con Salto",
    s: "str", lvl_min: 5, lvl_max: 25, t: "reps", domain: "conditioning",
    baseVal: 5, scale: 0.5,
    desc: "1. Da un salto de ayuda para subir el mentón sobre la barra. 2. Aguanta allí. 3. Desciende lentísimo (3-8 segundos). Desarrolla fuerza base de espalda.",
    m: "./img/techniques/str_10.png",
    alt: { n: "Remo Avanzado en Mesa", real: "Remo Pliométrico", desc: "Si no tienes barra, en la mesa tira explosivo e intenta soltar manos por una décima de segundo." }
  },
  {
    id: "str_11", n: "Tracción del Tigre", real: "Dominadas Estrictas",
    s: "str", lvl_min: 15, lvl_max: 40, t: "reps", domain: "conditioning",
    baseVal: 4, scale: 0.4,
    desc: "1. Cuélgate suelto. 2. Deprime escápulas e impúlsate hasta que el mentón pase la barra. 3. Baja completo sin soltar la tensión. Nada de balancear.",
    m: "./img/techniques/str_11.png",
    alt: { n: "Agujero Negro", real: "Supermán c/ Remo Isométrico en suelo", desc: "Acuéstate boca abajo y simula remar flotando intensamente si sigues sin barra." }
  },
  {
    id: "str_12", n: "Tigre Enfurecido", real: "L-Sit Pull-ups",
    s: "str", lvl_min: 30, lvl_max: 55, t: "reps", domain: "conditioning",
    baseVal: 3, scale: 0.3,
    desc: "1. Sube las piernas juntas rectas en 90° (como una L). 2. Mantén esa postura activando core y estirando isquios. 3. Realiza la dominada en esa posición.",
    m: "./img/techniques/str_12.png",
    alt: { n: "Remo Terrenal a una Mano", real: "Remo Invertido Unilateral", desc: "Si no hay barra, Remo de una mano apoyado de la mesa." }
  },
  {
    id: "str_13", n: "Muro Traspasado", real: "Muscle-Ups Lentos",
    s: "str", lvl_min: 50, lvl_max: 75, t: "reps", domain: "conditioning",
    baseVal: 2, scale: 0.2,
    desc: "1. Usa agarre falso si prefieres. 2. Tira fuerte hasta el ombligo. 3. Transición veloz pasando codos por encima. 4. Empuja como un 'dip' en lo alto de la barra.",
    m: "./img/techniques/str_13.png",
    alt: { n: "Fondo Explosivo", real: "Dips de Tríceps Pliométricos", desc: "Sin barra: En par de sillas, flexión de tríceps explosiva soltando las manos milisegundos." }
  },
  {
    id: "str_14", n: "Garfio de Acero", real: "Dominadas Asistidas a un Brazo",
    s: "str", lvl_min: 70, lvl_max: 95, t: "reps", domain: "conditioning",
    baseVal: 2, scale: 0.2,
    desc: "1. Cuelga de una mano. 2. Con la otra mano, apenas apoya dos dedos sobre el antebrazo. 3. Tira concentrando todo en el dorsal activo.",
    m: "./img/techniques/str_14.png",
    alt: { n: "N/A", real: "Supermán", desc: "Ya perdimos el control: busca una rama, no puedes llegar a élite sin barra." }
  },
  {
    id: "str_15", n: "Voluntad de los Dioses", real: "Dominadas a Un Brazo Puro (OAP)",
    s: "str", lvl_min: 90, lvl_max: 100, t: "reps", domain: "conditioning",
    baseVal: 1, scale: 0.1,
    desc: "1. Cuélgate con una sola mano. Mantén rotación torácica ajustada y cuerpo alineado. 2. Sube, bloquea y baja limpio. Nivel de Maestro Ascendido.",
    m: "./img/techniques/str_15.png", alt: null
  },

  // =========================================================
  // FUERZA Y POTENCIA (STR) - TREN INFERIOR (PIERNAS)
  // =========================================================
  {
    id: "str_16", n: "Paso Fundamental", real: "Sentadillas Libres",
    s: "str", lvl_min: 1, lvl_max: 10, t: "reps", domain: "conditioning",
    baseVal: 15, scale: 1.0,
    desc: "1. Pies ancho de hombros. 2. Baja quebrando el paralelo como si buscaras una silla invisible. 3. Espalda alineada, rodillas en línea al dedo índice del pie.",
    m: "./img/techniques/str_16.png", alt: null
  },
  {
    id: "str_17", n: "Zancada Guerrera", real: "Split Squat Estricto",
    s: "str", lvl_min: 5, lvl_max: 20, t: "reps", domain: "conditioning",
    baseVal: 12, scale: 0.8,
    desc: "1. Piernas separadas tipo lunge frontal estático. 2. Baja directamente el peso en la vertical hasta casi tocar el piso con la rodilla posterior.",
    m: "./img/techniques/str_17.png", alt: null
  },
  {
    id: "str_18", n: "Gravedad Dividida", real: "Sentadilla Búlgara",
    s: "str", lvl_min: 15, lvl_max: 40, t: "reps", domain: "conditioning",
    baseVal: 10, scale: 0.6,
    desc: "1. Pon un empeine sobre un sofá o escalón atrás. 2. La pierna delantera hace todo el soporte. 3. Baja y sube enfocado en fuerza unilateral.",
    m: "./img/techniques/str_18.png", alt: null
  },
  {
    id: "str_19", n: "Tallo de Acero", real: "Pistol Squat Asistido (Cajón/Silla)",
    s: "str", lvl_min: 30, lvl_max: 60, t: "reps", domain: "conditioning",
    baseVal: 6, scale: 0.4,
    desc: "1. Levanta una pierna al frente. 2. Baja lentamente sentándote en una silla. 3. Levántate con esa única pierna, pisando con el talón.",
    m: "./img/techniques/str_19.png", alt: null
  },
  {
    id: "str_20", n: "Pilar Inferior", real: "Pistol Squat Puro",
    s: "str", lvl_min: 50, lvl_max: 80, t: "reps", domain: "conditioning",
    baseVal: 4, scale: 0.3,
    desc: "1. Pierna al frente y en el aire. 2. Desciende lento hasta que tus glúteos toquen la pantorrilla/talón (full depth). Compresión extrema de piernas.",
    m: "./img/techniques/str_20.png", alt: null
  },
  {
    id: "str_21", n: "Fuerza del Dragón Oculto", real: "Dragon Pistols",
    s: "str", lvl_min: 75, lvl_max: 100, t: "reps", domain: "conditioning",
    baseVal: 3, scale: 0.2,
    desc: "1. Como Pistol Squat, pero cruzas y extiendes la pierna en el aire DETRÁS y AL LADO de la pierna de apoyo. Rompe toda dependencia compensatoria.",
    m: "./img/techniques/str_21.png", alt: null
  },

  // =========================================================
  // VELOCIDAD Y EXPLOSIVIDAD (SPD)
  // =========================================================
  {
    id: "spd_1", n: "Flama Titilante", real: "Sprawls Suaves",
    s: "spd", lvl_min: 1, lvl_max: 10, t: "reps", domain: "conditioning",
    baseVal: 10, scale: 1.0,
    desc: "1. Desde pie, baja las manos al suelo, tira cadera rápido al piso para interceptar un derribo. 2. Sube inmediatamente sin salto ni flexión.",
    m: "./img/techniques/spd_1.png", alt: null
  },
  {
    id: "spd_2", n: "Viento Cruzado", real: "Mountain Climbers Veloces",
    s: "spd", lvl_min: 5, lvl_max: 20, t: "time", domain: "conditioning",
    baseVal: 30, scale: 1.5,
    desc: "1. Posición de plancha. 2. Lleva alternando rodillas al pecho muy veloz cuidando que la cadera no rebote descontroladamente.",
    m: "./img/techniques/spd_2.png", alt: null
  },
  {
    id: "spd_3", n: "Defensa Mortal", real: "Burpees Marciales Estrictos",
    s: "spd", lvl_min: 15, lvl_max: 40, t: "reps", domain: "conditioning",
    baseVal: 10, scale: 0.8,
    desc: "1. Cae soltando peso con una flexión de brazo real al ras del piso. 2. Retorna pies. 3. Da un salto al cielo en vertical estricto.",
    m: "./img/techniques/spd_3.png", alt: null
  },
  {
    id: "spd_4", n: "Estocada Feroz", real: "Squat Jumps / Saltos de Rana",
    s: "spd", lvl_min: 25, lvl_max: 55, t: "reps", domain: "conditioning",
    baseVal: 12, scale: 0.7,
    desc: "1. Baja profundo a sentadilla. 2. Salta buscando el techo extendiendo violentamente piernas, tobillos y cadera al unísono.",
    m: "./img/techniques/spd_4.png", alt: null
  },
  {
    id: "spd_5", n: "Patada de Sombra", real: "Kick Throughs / Sit Throughs",
    s: "spd", lvl_min: 35, lvl_max: 65, t: "reps", domain: "conditioning",
    baseVal: 14, scale: 0.6,
    desc: "1. Postura de oso (4 patas). 2. Levanta mano y desliza pierna opuesta cruzada PATEANDO hacia tu lateral de forma fluida. Destreza extrema.",
    m: "./img/techniques/spd_5.png", alt: null
  },
  {
    id: "spd_6", n: "Salto del Guepardo", real: "Tuck Jumps Continuos",
    s: "spd", lvl_min: 50, lvl_max: 85, t: "time", domain: "conditioning",
    baseVal: 20, scale: 1.5,
    desc: "1. Salto Vertical máximo y al estar en el aire, llevas ambas rodillas fuertes al pecho o abdomen. 2. Cae y repite como un resorte brutal. Cardíovasular nivel Dios.",
    m: "./img/techniques/spd_6.png", alt: null
  },
  {
    id: "spd_7", n: "Asalto Fantasma", real: "Burpees Monopodales (1 Pierna)",
    s: "spd", lvl_min: 75, lvl_max: 100, t: "reps", domain: "conditioning",
    baseVal: 8, scale: 0.5,
    desc: "1. Mantén un pie suspendido SIEMPRE. 2. Baja, flexión en 1 pie, vuelve explosivo en 1 pie, y salta. Cambia pie cada repetición. Pliometría letal.",
    m: "./img/techniques/spd_7.png", alt: null
  },

  // =========================================================
  // RESISTENCIA CORE E ISOMÉTRICA (END)
  // =========================================================
  {
    id: "end_1", n: "Centro Pasivo", real: "Plancha Apoyando Rodillas",
    s: "end", lvl_min: 1, lvl_max: 10, t: "time", domain: "conditioning",
    baseVal: 30, scale: 2.0,
    desc: "1. Antebrazos y rodillas al suelo. 2. Mete o 'Retro-vierte' la pelvis activando glúteo para que tu espalda esté recta. Faja base.",
    m: "./img/techniques/end_1.png", alt: null
  },
  {
    id: "end_2", n: "Fortaleza Viva", real: "Plancha Frontal Clásica Estricta",
    s: "end", lvl_min: 5, lvl_max: 20, t: "time", domain: "conditioning",
    baseVal: 40, scale: 1.5,
    desc: "1. Antebrazos y puntas de los pies. 2. Glúteos y muslos como rocas. 3. Aleja el piso redondeando levísimamente la parte alta de la espalda.",
    m: "./img/techniques/end_2.png", alt: null
  },
  {
    id: "end_3", n: "Core de Hierro", real: "Hollow Body Hold",
    s: "end", lvl_min: 10, lvl_max: 30, t: "time", domain: "conditioning",
    baseVal: 30, scale: 1.2,
    desc: "1. Acuéstate y aplasta obligatoriamente tu zona baja/lumbar FUERTE contra el piso. 2. Mantén estiradas tus piernas y brazos suspendidos.",
    m: "./img/techniques/end_3.png", alt: null
  },
  {
    id: "end_4", n: "Defensa Constante", real: "V-Ups (Abdominales Bisagra)",
    s: "end", lvl_min: 25, lvl_max: 50, t: "reps", domain: "conditioning",
    baseVal: 15, scale: 0.5,
    desc: "1. Acostado estirado. 2. Levanta tronco y piernas rígidas cerrándote de golpe para que las manos toquen puntas del pie.",
    m: "./img/techniques/end_4.png", alt: null
  },
  {
    id: "end_5", n: "Bandera del Dragón", real: "Dragon Flags",
    s: "end", lvl_min: 45, lvl_max: 75, t: "reps", domain: "conditioning",
    baseVal: 5, scale: 0.3,
    desc: "1. Acostado, manos agarradas a un pilar fuerte atrás. 2. Core rígido con el cuerpo enderezado como tabla ascendiendo. 3. Regresa bajando súper lento el tablón humano.",
    m: "./img/techniques/end_5.png", alt: null
  },
  {
    id: "end_6", n: "Desafío de Gravedad", real: "L-Sit Rígido en Suelo",
    s: "end", lvl_min: 65, lvl_max: 90, t: "time", domain: "conditioning",
    baseVal: 10, scale: 0.5,
    desc: "1. Manos apoyadas en piso o paraletas. 2. Trabas codos. 3. Eleva ambas piernas rectas en 90 grados horizontales forzando isquio y compresión ilíaca máxima.",
    m: "./img/techniques/end_6.png", alt: null
  },
  {
    id: "end_7", n: "Oráculo Corporal", real: "V-Sit Sostenido Extremoso",
    s: "end", lvl_min: 80, lvl_max: 100, t: "time", domain: "conditioning",
    baseVal: 5, scale: 0.3,
    desc: "1. Evolución del L-Sit. Manos atrás, y las piernas rectas suben acercándose a tu rostro como un ángulo cerrado levitando.",
    m: "./img/techniques/end_7.png", alt: null
  },
  // Piernas y Cadenas Posteriores (END)
  {
    id: "end_8", n: "Enraizamiento Base", real: "Postura del Jinete (Ma Bu) Alta",
    s: "end", lvl_min: 1, lvl_max: 15, t: "time", domain: "conditioning",
    baseVal: 40, scale: 1.5,
    desc: "1. Piernas abiertas. Baja la cadera poco. Concentración en estabilizar rodillas y sostener mentalmente isometría baja intensiva.",
    m: "./img/techniques/end_8.png", alt: null
  },
  {
    id: "end_9", n: "Muralla Inquebrantable", real: "Sentadilla Isométrica (Wall Sit)",
    s: "end", lvl_min: 10, lvl_max: 40, t: "time", domain: "conditioning",
    baseVal: 40, scale: 1.2,
    desc: "1. Apoyado en muro a 90 grados paralelos exactos al piso. Aguante mental y ácido láctico quemando isquiotibiales y glúteos.",
    m: "./img/techniques/end_9.png", alt: null
  },
  {
    id: "end_10", n: "Roble del Sensei", real: "Ma Bu Profundo (Shaolin stance)",
    s: "end", lvl_min: 30, lvl_max: 65, t: "time", domain: "conditioning",
    baseVal: 30, scale: 1.0,
    desc: "1. El Jinete perfecto sin muralla. Piernas descendidas paralelas al piso. Torso herguido. Siente cómo se fortalecen ligamentos micro.",
    m: "./img/techniques/end_10.png", alt: null
  },

  // =========================================================
  // RECUPERACIÓN y FLEXIBILIDAD (FLEX - 6 RAMAS)
  // =========================================================

  // RAMA 1: Isquiotibiales y Linea Frontal (Splits Frontales)
  {
    id: "flex_1", n: "Cauce Blando", real: "Plegado Frontal Asistido de Pie",
    s: "flex", lvl_min: 1, lvl_max: 15, t: "time", domain: "mobility",
    baseVal: 40, scale: 1.0,
    desc: "1. De pie, rodillas un poquito flectadas. Relaja todo el torso cayendo peso muerto hacia adelante liberando espasmos de fascia.",
    m: "./img/techniques/flex_1.png", alt: null
  },
  {
    id: "flex_2", n: "Sauce en el Río", real: "Pike Stretch Sentado Cierre Plano",
    s: "flex", lvl_min: 10, lvl_max: 30, t: "time", domain: "mobility",
    baseVal: 45, scale: 1.2,
    desc: "1. Sentado, piernas juntas rígidamente estiradas. Intenta doblar articulando LA CADERA, buscando que el vientre / ombligo bese los muslos.",
    m: "./img/techniques/flex_2.png", alt: null
  },
  {
    id: "flex_3", n: "Cisne que Desciende", real: "Jefferson Curl Lento",
    s: "flex", lvl_min: 25, lvl_max: 60, t: "reps", domain: "mobility",
    baseVal: 8, scale: 0.5,
    desc: "1. Súbete escalón ligero. Mentón al pecho firme y vas desenrollando vértebra tras vértebra para bajar hasta estiramiento profundo, recuperando vértebra a vértebra subiendo.",
    m: "./img/techniques/flex_3.png", alt: null
  },
  {
    id: "flex_4", n: "Espada de Tijera Frontal", real: "Over-Split Frontal / Spagat Frontal",
    s: "flex", lvl_min: 50, lvl_max: 100, t: "time", domain: "mobility",
    baseVal: 30, scale: 0.5,
    desc: "1. Spagat lomo plano o poniendo el talón frontal bloqueado sobre un ladrillo grueso para hiper-movilidad de psoas trasero e isquio delantero de élite.",
    m: "./img/techniques/flex_4.png", alt: null
  },

  // RAMA 2: Aductores y Rotaciòn Lateral (Side Kicks / High Kicks laterales)
  {
    id: "flex_5", n: "Alas de Mariposa", real: "Butterfly Stretch Abierto",
    s: "flex", lvl_min: 1, lvl_max: 20, t: "time", domain: "mobility",
    baseVal: 45, scale: 1.0,
    desc: "1. Siéntate juntando plantas de pie relajadas. Lleva pecho al piso buscando sentir apertura pélvica de aductor blando y cadera proximal.",
    m: "./img/techniques/flex_5.png", alt: null
  },
  {
    id: "flex_6", n: "Rana en Estanque", real: "Frog Pose (Rana de Cadera)",
    s: "flex", lvl_min: 15, lvl_max: 40, t: "time", domain: "mobility",
    baseVal: 40, scale: 1.2,
    desc: "1. Cuatro patas abrindo las rodillas al máximo a los costados haciendo base. Caderas alineadas a rodillas. Déjate caer abriendo la capsula isquiopúbica.",
    m: "./img/techniques/flex_6.png", alt: null
  },
  {
    id: "flex_7", n: "Descanso del Artista", real: "Cossack Squats isométrico lateral",
    s: "flex", lvl_min: 30, lvl_max: 60, t: "time", domain: "mobility",
    baseVal: 30, scale: 0.8,
    desc: "1. Zancada puramente lateral como araña. Sosten glúteo pegado al talón apoyado, la rodilla sin estréss, la contraria bloqueada rodilla recta. Alterna lado a lado.",
    m: "./img/techniques/flex_7.png", alt: null
  },
  {
    id: "flex_8", n: "Apertura de Loto Terrenal", real: "Pancake Stretch Avanzado",
    s: "flex", lvl_min: 50, lvl_max: 80, t: "time", domain: "mobility",
    baseVal: 35, scale: 1.0,
    desc: "1. Sentado abriendo ambas piernas en V ultra grande. Mantén pecho erguido y acuéstate hacia el frente relajando psoas interno.",
    m: "./img/techniques/flex_8.png", alt: null
  },
  {
    id: "flex_9", n: "Abanico del Sol", real: "Middle Split / Spagat Side Total",
    s: "flex", lvl_min: 70, lvl_max: 100, t: "time", domain: "mobility",
    baseVal: 30, scale: 1.0,
    desc: "1. Manteniendo peso centrado abre lentamente ambos pies perpendiculares hasta el máximo de 180° glúteos tocando piso dominando fémures bilaterales.",
    m: "./img/techniques/flex_9.png", alt: null
  },

  // RAMA 3: Flexores de cadera y Psoas (Guardia Grappling / Derribo y Patada atás)
  {
    id: "flex_10", n: "Reposo Cauteloso", real: "Zancada Psoas Pasivo",
    s: "flex", lvl_min: 1, lvl_max: 20, t: "time", domain: "mobility",
    baseVal: 40, scale: 1.0,
    desc: "1. Zancada con rodilla posterior en esterilla. Endereza tu peso torso arriba e intenta contraer ese glúteo trasero abriendo toda la ingle pesada.",
    m: "./img/techniques/flex_10.png", alt: null
  },
  {
    id: "flex_11", n: "Paso de Araña", real: "Spiderman Lunge Rotacional",
    s: "flex", lvl_min: 15, lvl_max: 45, t: "time", domain: "mobility",
    baseVal: 35, scale: 1.2,
    desc: "1. Pierna fuerte al frente y tira la otra recta larga al fondo. Desciende y rota el pecho levantando el brazo.",
    m: "./img/techniques/flex_11.png", alt: null
  },
  {
    id: "flex_12", n: "Carga del Lagarto", real: "Lizard Stretch (Codos en piso)",
    s: "flex", lvl_min: 35, lvl_max: 75, t: "time", domain: "mobility",
    baseVal: 35, scale: 1.2,
    desc: "1. Clávate en un Lunge Spiderman gigante. Apoya ambos codos adentro del tobillo líder rompiendo nudos en la cápsula y estirando todo el lado oculto del Psoas.",
    m: "./img/techniques/flex_12.png", alt: null
  },
  {
    id: "flex_13", n: "Agonía Constante", real: "Couch Stretch en Pared (Mortal)",
    s: "flex", lvl_min: 60, lvl_max: 100, t: "time", domain: "mobility",
    baseVal: 30, scale: 1.0,
    desc: "1. Rodilla izquierda en esquina pared/suelo, canilla de ese pie aplastando pegada al muro. Pie derecho zancada libre frente a ti. Levanta pecho a tocar muro.",
    m: "./img/techniques/flex_13.png", alt: null
  },

  // RAMA 4: Glúteo y Prevención Rodilla ITB
  {
    id: "flex_14", n: "Seda Enroscada", real: "Piriforme Cruzado Básico",
    s: "flex", lvl_min: 1, lvl_max: 25, t: "time", domain: "mobility",
    baseVal: 35, scale: 1.0,
    desc: "1. Lying face up. Cruzar el pie encima rodilla opuesta (forma del 4) y tira rodilla atascada hacia tu tórax estirando rotadores.",
    m: "./img/techniques/flex_14.png", alt: null
  },
  {
    id: "flex_15", n: "Ejes Quebrados", real: "90/90 Sit (Fluido de cadera interna)",
    s: "flex", lvl_min: 20, lvl_max: 50, t: "time", domain: "mobility",
    baseVal: 40, scale: 1.0,
    desc: "1. Suelo 90 grados cadera flexionada pierna en frente lateral, otra pierna cadera rotada lado. Incomodidad de rotación externa salva meniscos y cartílagos cruzados.",
    m: "./img/techniques/flex_15.png", alt: null
  },
  {
    id: "flex_16", n: "Descanso del Gorrión", real: "Pigeon Pose Estricto / Paloma",
    s: "flex", lvl_min: 40, lvl_max: 80, t: "time", domain: "mobility",
    baseVal: 40, scale: 1.0,
    desc: "1. Cruza toda la tibia delante perpendicular. La pierna contraria recta al fondo descansando. Pélvis intentando empujar centrado al piso aliviando banda y glute media.",
    m: "./img/techniques/flex_16.png", alt: null
  },
  {
    id: "flex_17", n: "Danza del Loto", real: "Postura del Loto o Medio Loto Forjado",
    s: "flex", lvl_min: 75, lvl_max: 100, t: "time", domain: "mobility",
    baseVal: 30, scale: 1.0,
    desc: "1. Maestría Rotacional pasiva. Cruce de ambos tobillos encimando y trabando las ingles sobre cuádriceps superior abriendo caderas como un buda real.",
    m: "./img/techniques/flex_17.png", alt: null
  },

  // RAMA 5: Columna y Descompresión Lumbar/Espinal
  {
    id: "flex_18", n: "Corriente de Agua", real: "Gato-Camello Pélvico Fluido",
    s: "flex", lvl_min: 1, lvl_max: 25, t: "reps", domain: "mobility",
    baseVal: 12, scale: 0.5,
    desc: "1. Cuadrupedal. Hunde hiper extendida la espalda sacando colita y mirando arriba. Luego encorva y esconde todo erizando. Lubrica anillos vertebrales.",
    m: "./img/techniques/flex_18.png", alt: null
  },
  {
    id: "flex_19", n: "Ennebrado Espiral", real: "Torsión Torácica Thread The Needle",
    s: "flex", lvl_min: 15, lvl_max: 45, t: "time", domain: "mobility",
    baseVal: 35, scale: 1.0,
    desc: "1. Cuatro apoyos. Cruza mano derecha arrastrando debajo de izquierda cruzando el peso lejos, hombro derecho toca suelo rotando toda espalda media liberando tensiones.",
    m: "./img/techniques/flex_19.png", alt: null
  },
  {
    id: "flex_20", n: "Punzón de Veneno", real: "Escorpión Acostado de Espalda o Prono",
    s: "flex", lvl_min: 30, lvl_max: 65, t: "time", domain: "mobility",
    baseVal: 35, scale: 1.0,
    desc: "1. T-Lying. Rotar pelvis para que el talón cruce pasando al lado contralateral tocando suelo re-creando una de compresión rotatoria profunda sin forzar dolor articular.",
    m: "./img/techniques/flex_20.png", alt: null
  },
  {
    id: "flex_21", n: "Alineación Astral", real: "Cobra Abdominal Lumbar Supina",
    s: "flex", lvl_min: 50, lvl_max: 85, t: "time", domain: "mobility",
    baseVal: 30, scale: 1.0,
    desc: "1. Boca abajo brazos al lado costillas, despegar bloqueando codos torso y pecho con isometría, pelvis tocando suelo relajando toda el arco extensor de la espalda baja.",
    m: "./img/techniques/flex_21.png", alt: null
  },
  {
    id: "flex_22", n: "Rueda del Universo", real: "Puente / Arco Wheel Pose Total",
    s: "flex", lvl_min: 75, lvl_max: 100, t: "time", domain: "mobility",
    baseVal: 20, scale: 0.5,
    desc: "1. Recostado, clavar extremidades piso levantar todo el torso generando U invertida pura arqueando para la fuerza invencible ante estrangulaciones y scrambles.",
    m: "./img/techniques/flex_22.png", alt: null
  },

  // RAMA 6: Cintura Escapular, Guardia de Hombros y Pectoral
  {
    id: "flex_23", n: "Aleteo Contenido", real: "Cruzados de Brazo p/ Deltoides Posterior",
    s: "flex", lvl_min: 1, lvl_max: 20, t: "time", domain: "mobility",
    baseVal: 40, scale: 1.0,
    desc: "1. Estira brazo transversal apretando codo, elongando la musculatura microdesgarrada tras boxeo intenso de la parte posterior.",
    m: "./img/techniques/flex_23.png", alt: null
  },
  {
    id: "flex_24", n: "Arcoiris de Hombro", real: "Dislocaciones con Toalla Amplias",
    s: "flex", lvl_min: 20, lvl_max: 60, t: "reps", domain: "mobility",
    baseVal: 10, scale: 0.5,
    desc: "1. Toma toalla amplia codos bloqueadísimos, eleva manos y pasa hasta atrás la espalda y vuelve abriendo fascia Pectoral y labrum de hombros.",
    m: "./img/techniques/flex_24.png",
    alt: { n: "Giro en Marco de Puerta", real: "Estiramiento Pectoral Puerta", desc: "No hay toalla: Atora brazo a 90° en cualquier marco y rota pecho fuera estrujando hombro/pecho." }
  },
  {
    id: "flex_25", n: "Perro Torácico", real: "Puppy Stretch o T-Spine en Pared",
    s: "flex", lvl_min: 45, lvl_max: 80, t: "time", domain: "mobility",
    baseVal: 35, scale: 1.0,
    desc: "1. Cae hundiendo el peso del pecho apuntando piso sobre brazos largos abriendo los dorsales lats asombrosamente. Impide hombro caído hacia adelante (Cifosis).",
    m: "./img/techniques/flex_25.png", alt: null
  },
  {
    id: "flex_26", n: "Hojas de Guillotina", real: "Dislocaciones Cerradas / OHS Squat Test",
    s: "flex", lvl_min: 70, lvl_max: 100, t: "reps", domain: "mobility",
    baseVal: 8, scale: 0.2,
    desc: "1. Agarre ultracerrado de un bastón rígido repitiendo rotación hacia atrás sin que se doble ninguno de los codos. Un tendón inquebrantable rotador del supraespinoso.",
    m: "./img/techniques/flex_26.png",
    alt: { n: "Pared Celestial", real: "Wall Angels a ras de pared", desc: "Alternativa forzada sin madera." }
  }

];
