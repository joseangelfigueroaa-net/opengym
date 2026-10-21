// Training models a trainer can lay over a client's month (Trainnery).
//
// Each model says what it is for (goal), who it suits or protects (limitations), how the week is
// split (focus), and WHY it is built that way — a short rationale with the research or position
// stand behind it, so a trainer can explain the plan to a client and judge whether it fits.
// Exercise ids are the app's library (lib/exercises-data.js); every exercise used here also
// carries a one-line note on what it trains and why it earns its place.
//
// Rep ranges drive the app's double progression: the client works inside repsMin–reps and the
// load goes up once every set reaches the top (see lib/progression.js).
//
// Written in Spanish on purpose: this is coaching content for Trainnery's Latin American
// trainers, not interface chrome; the labels around it go through t() as usual.

/* ---------- vocabulary shared with the server (api/trainer/assign.js) ---------- */
export const GOALS = {
  strength: 'Fuerza', muscle: 'Masa muscular', fat_loss: 'Pérdida de grasa', endurance: 'Resistencia', health: 'Salud general'
}
export const LIMITS = {
  knee: 'Rodilla sensible', lower_back: 'Espalda baja', shoulder: 'Hombro', wrist: 'Muñeca',
  no_gym: 'Sin gimnasio (casa)', beginner: 'Principiante'
}
export const FOCUS = {
  full_body: 'Cuerpo completo', upper_lower: 'Torso / pierna', push_pull_legs: 'Empuje / jalón / pierna',
  glutes_legs: 'Glúteo y pierna', conditioning: 'Acondicionamiento'
}

/* ---------- references (real, citable) ---------- */
const R = {
  acsm2009: { text: 'ACSM (2009). Progression models in resistance training for healthy adults. Med Sci Sports Exerc 41(3):687-708.', url: 'https://pubmed.ncbi.nlm.nih.gov/19204579/' },
  acsm2011: { text: 'Garber et al. / ACSM (2011). Quantity and quality of exercise for developing and maintaining fitness in apparently healthy adults. Med Sci Sports Exerc 43(7):1334-1359.', url: 'https://pubmed.ncbi.nlm.nih.gov/21694556/' },
  volume2017: { text: 'Schoenfeld, Ogborn y Krieger (2017). Dose-response relationship between weekly resistance training volume and increases in muscle mass. J Sports Sci 35(11):1073-1082.', url: 'https://pubmed.ncbi.nlm.nih.gov/27433992/' },
  freq2016: { text: 'Schoenfeld, Ogborn y Krieger (2016). Effects of resistance training frequency on measures of muscle hypertrophy: a systematic review and meta-analysis. Sports Med 46(11):1689-1697.', url: 'https://pubmed.ncbi.nlm.nih.gov/27102172/' },
  freqStr2018: { text: 'Grgic et al. (2018). Effect of resistance training frequency on gains in muscular strength: a systematic review and meta-analysis. Sports Med 48(5):1207-1220.', url: 'https://pubmed.ncbi.nlm.nih.gov/29470825/' },
  loads2017: { text: 'Schoenfeld et al. (2017). Strength and hypertrophy adaptations between low- vs. high-load resistance training: a systematic review and meta-analysis. J Strength Cond Res 31(12):3508-3523.', url: 'https://pubmed.ncbi.nlm.nih.gov/28834797/' },
  who2020: { text: 'OMS (2020). Directrices de la OMS sobre actividad física y hábitos sedentarios.', url: 'https://www.who.int/es/publications/i/item/9789240014886' },
  willis2012: { text: 'Willis et al. (2012). Effects of aerobic and/or resistance training on body mass and fat mass in overweight or obese adults. J Appl Physiol 113(12):1831-1837.', url: 'https://pubmed.ncbi.nlm.nih.gov/23019316/' },
  crossley2016: { text: 'Crossley et al. (2016). 2016 Patellofemoral pain consensus statement. Br J Sports Med 50(14):839-843.', url: 'https://pubmed.ncbi.nlm.nih.gov/27343241/' },
  nice2016: { text: 'NICE (2016, act. 2020). Low back pain and sciatica in over 16s: assessment and management (NG59).', url: 'https://www.nice.org.uk/guidance/ng59' },
  mcgill: { text: 'McGill, S. (2016). Low Back Disorders: Evidence-Based Prevention and Rehabilitation, 3.ª ed. Human Kinetics.', url: 'https://us.humankinetics.com/products/low-back-disorders-3rd-edition' },
  fragala2019: { text: 'Fragala et al. (2019). Resistance training for older adults: position statement from the NSCA. J Strength Cond Res 33(8):2019-2052.', url: 'https://pubmed.ncbi.nlm.nih.gov/31343601/' }
}

/* ---------- why each exercise is in the library ---------- */
export const EX_NOTES = {
  '0043': 'Sentadilla con barra: patrón básico de rodilla y cadera; carga cuádriceps, glúteos y aductores con mucha transferencia a la fuerza general.',
  '1760': 'Sentadilla goblet: la carga delante enseña a mantener el tronco erguido; ideal para aprender a sentarse y para rodillas que no toleran mucha carga.',
  '0032': 'Peso muerto: bisagra de cadera con la mayor carga posible; cadena posterior completa (glúteos, isquios, espalda) y fuerza de agarre.',
  '0085': 'Peso muerto rumano: bisagra con rodilla casi fija; énfasis en isquiotibiales estirados bajo carga, clave para hipertrofia y salud de la cadera.',
  '1459': 'Peso muerto rumano con mancuernas: misma bisagra con menos carga axial; buena opción para aprender el patrón o proteger la espalda.',
  '0025': 'Press de banca: empuje horizontal principal; pectoral, deltoides anterior y tríceps. Permite progresar la carga en pasos pequeños.',
  '0289': 'Press con mancuernas: empuje horizontal con más rango y libertad de muñeca y hombro que la barra.',
  '0314': 'Press inclinado con mancuernas: inclina el trabajo hacia la porción clavicular del pectoral y el hombro anterior.',
  '0577': 'Press de pecho en máquina: trayectoria guiada; útil con hombro o muñeca sensibles y para acercarse al fallo con seguridad.',
  '0662': 'Flexiones: empuje horizontal con peso corporal; escalable (inclinadas, pies elevados) y sin equipo.',
  '0493': 'Flexiones inclinadas: versión más fácil de la flexión; reduce la carga sobre muñeca y hombro.',
  '0405': 'Press de hombro sentado con mancuernas: empuje vertical; deltoides y tríceps con el tronco apoyado.',
  '0426': 'Press de hombro de pie con mancuernas: empuje vertical que además exige estabilidad del tronco.',
  '0334': 'Elevaciones laterales: aíslan el deltoides lateral, que los presses trabajan poco.',
  '0993': 'Pájaro con banda: deltoides posterior y estabilizadores de la escápula; equilibra el trabajo de empuje y cuida el hombro.',
  '2330': 'Jalón al pecho: tracción vertical guiada; dorsal ancho y bíceps, escalable para quien aún no hace dominadas.',
  '0652': 'Dominadas: tracción vertical con peso corporal; dorsal, bíceps y agarre.',
  '1326': 'Dominadas supinas: variante con más bíceps; suele ser la primera dominada que se logra.',
  '0027': 'Remo con barra: tracción horizontal pesada; espalda media, dorsal y erectores en posición de bisagra.',
  '0293': 'Remo con mancuernas inclinado: tracción horizontal con ambos brazos y menos carga sobre la columna que la barra.',
  '0292': 'Remo a una mano: tracción horizontal con el tronco apoyado; protege la espalda baja y permite cargar fuerte.',
  '0861': 'Remo en polea sentado: tracción horizontal estable; trabajo escapular controlado y fácil de progresar.',
  '1350': 'Remo en máquina: tracción horizontal guiada con el pecho apoyado; sin carga sobre la espalda baja.',
  '0499': 'Remo invertido: tracción horizontal con peso corporal (barra baja o mesa firme); escalable cambiando el ángulo.',
  '0988': 'Remo con banda a una mano: tracción horizontal sin máquinas, para entrenar en casa.',
  '0201': 'Extensión de tríceps en polea: aísla el tríceps con poca exigencia para el hombro.',
  '0031': 'Curl con barra: flexión de codo; bíceps braquial.',
  '1648': 'Curl martillo: braquial y braquiorradial; agarre neutro más amable con codo y muñeca.',
  '1409': 'Puente de glúteos con barra: extensión de cadera con el glúteo mayor como protagonista y casi sin carga axial.',
  '3013': 'Puente de glúteos en el suelo: extensión de cadera sin equipo; base para activar glúteos y proteger rodilla y espalda.',
  '0336': 'Zancadas con mancuernas: trabajo a una pierna; cuádriceps y glúteos, además de equilibrio y control de rodilla.',
  '1460': 'Zancadas caminando: zancada dinámica; más exigencia de equilibrio y gasto energético.',
  '0431': 'Subida al cajón: trabajo a una pierna con altura ajustable; muy útil para rodilla sensible usando un cajón bajo.',
  '2287': 'Prensa de piernas: empuje de piernas guiado; mucha carga para cuádriceps y glúteos sin cargar la columna.',
  '0585': 'Extensión de cuádriceps: aísla el cuádriceps; en rodilla sensible se usa con rango y carga tolerables.',
  '0586': 'Curl femoral tumbado: aísla los isquiotibiales en flexión de rodilla; complementa la bisagra.',
  '0196': 'Tirón de polea entre piernas: bisagra de cadera con carga horizontal; enseña el patrón con muy poca carga sobre la espalda.',
  '0549': 'Swing con kettlebell: bisagra explosiva; potencia de cadera y alta demanda cardiovascular.',
  '1373': 'Elevación de talones de pie: tríceps sural (gemelos y sóleo); salud del tobillo y la marcha.',
  '0417': 'Elevación de talones con mancuernas: misma función con carga añadida.',
  '0276': 'Dead bug: estabilidad del tronco con la columna neutra, sin flexionarla; recomendado en programas de espalda baja.',
  '0979': 'Press Pallof con banda: anti-rotación; el tronco resiste el giro, que es como trabaja en la vida diaria.',
  '1004': 'Sentadilla con banda: patrón de sentadilla con resistencia elástica para entrenar en casa.'
}

/* ---------- helpers to keep the sessions readable ---------- */
const e = (id, sets, repsMin, reps) => ({ id, sets, repsMin, reps })

/* ---------- the models ---------- */
export const PROGRAMS = [
  {
    id: 'fundamentos',
    name: 'Fundamentos de cuerpo completo',
    summary: 'Dos sesiones (A y B) alternadas, 3 días por semana, con los patrones básicos: sentadilla, bisagra, empuje y tracción.',
    level: 'Principiante', days: 3, weekdays: [1, 3, 5],
    goals: ['health', 'strength', 'muscle'], suits: ['beginner'], avoid: [], focus: 'full_body',
    basis: 'Para quien empieza, el ACSM recomienda entrenar todo el cuerpo 2 o 3 días por semana, con 1 a 3 series de 8 a 12 repeticiones y sobrecarga progresiva. Repetir los mismos patrones varias veces por semana acelera el aprendizaje técnico, y alternar A y B reparte la fatiga.',
    refs: [R.acsm2009, R.acsm2011],
    sessions: [
      { name: 'Cuerpo completo A', ex: [e('1760', 3, 8, 12), e('0289', 3, 8, 12), e('0861', 3, 8, 12), e('1459', 2, 8, 12), e('0276', 2, 8, 12)] },
      { name: 'Cuerpo completo B', ex: [e('2287', 3, 10, 12), e('2330', 3, 8, 12), e('0405', 3, 8, 12), e('3013', 2, 10, 15), e('0979', 2, 10, 12)] }
    ]
  },
  {
    id: 'torso-pierna',
    name: 'Torso / pierna para hipertrofia',
    summary: 'Cuatro días: dos de torso y dos de pierna. Cada músculo se entrena dos veces por semana con 6 a 12 repeticiones.',
    level: 'Intermedio', days: 4, weekdays: [1, 2, 4, 5],
    goals: ['muscle', 'strength'], suits: [], avoid: ['beginner'], focus: 'upper_lower',
    basis: 'Entrenar cada grupo muscular al menos dos veces por semana produce más hipertrofia que hacerlo una sola vez. Además, la ganancia muscular aumenta con el volumen semanal: unas 10 series o más por músculo rinden más que menos de 5. Repartido en torso y pierna se alcanza ese volumen sin sesiones eternas.',
    refs: [R.freq2016, R.volume2017, R.acsm2009],
    sessions: [
      { name: 'Torso: fuerza', ex: [e('0025', 4, 6, 8), e('0027', 4, 6, 8), e('0405', 3, 8, 10), e('2330', 3, 8, 10), e('0201', 2, 10, 12)] },
      { name: 'Pierna: cuádriceps', ex: [e('0043', 4, 6, 8), e('2287', 3, 10, 12), e('0336', 3, 8, 10), e('0585', 3, 12, 15), e('1373', 3, 12, 15)] },
      { name: 'Torso: volumen', ex: [e('0314', 3, 8, 12), e('0861', 3, 10, 12), e('0334', 3, 12, 15), e('0292', 3, 10, 12), e('0031', 3, 10, 12)] },
      { name: 'Pierna: cadena posterior', ex: [e('0085', 4, 6, 10), e('1409', 3, 8, 12), e('0586', 3, 10, 12), e('0431', 3, 10, 12), e('0979', 3, 10, 12)] }
    ]
  },
  {
    id: 'empuje-jalon-pierna',
    name: 'Empuje / jalón / pierna',
    summary: 'Tres sesiones especializadas que se repiten dos veces por semana (6 días) o una vez (3 días) según el tiempo del cliente.',
    level: 'Intermedio a avanzado', days: 6, weekdays: [1, 2, 3, 4, 5, 6],
    goals: ['muscle'], suits: [], avoid: ['beginner'], focus: 'push_pull_legs',
    basis: 'Agrupar los músculos por función (empuje, jalón, pierna) permite mucho volumen por sesión con buena recuperación entre días. Hecho 6 días, cada músculo recibe dos estímulos por semana; con 3 días sigue funcionando, pero conviene subir las series por sesión para mantener el volumen semanal.',
    refs: [R.volume2017, R.freq2016],
    sessions: [
      { name: 'Empuje', ex: [e('0025', 4, 6, 10), e('0405', 3, 8, 10), e('0314', 3, 8, 12), e('0334', 3, 12, 15), e('0201', 3, 10, 12)] },
      { name: 'Jalón', ex: [e('0652', 3, 5, 10), e('0027', 4, 6, 10), e('0861', 3, 10, 12), e('0993', 3, 12, 15), e('1648', 3, 10, 12)] },
      { name: 'Pierna', ex: [e('0043', 4, 6, 10), e('0085', 3, 8, 10), e('2287', 3, 10, 12), e('0586', 3, 10, 12), e('0417', 3, 12, 15)] }
    ]
  },
  {
    id: 'fuerza-basica',
    name: 'Fuerza con básicos',
    summary: 'Tres días de cuerpo completo con los grandes levantamientos en rangos bajos (3 a 6 repeticiones), pocos ejercicios y descansos largos.',
    level: 'Intermedio', days: 3, weekdays: [1, 3, 5],
    goals: ['strength'], suits: [], avoid: ['beginner', 'lower_back', 'knee'], focus: 'full_body',
    basis: 'La fuerza máxima responde mejor a cargas altas (aprox. 80 a 90 % de 1RM, 1 a 6 repeticiones) con 2 a 5 minutos de descanso. Por el principio de especificidad, mejora más lo que se entrena: practicar los mismos levantamientos con frecuencia. Con el mismo volumen, la frecuencia semanal importa menos para la fuerza, así que 3 días bastan.',
    refs: [R.acsm2009, R.loads2017, R.freqStr2018],
    sessions: [
      { name: 'Fuerza A', ex: [e('0043', 5, 3, 5), e('0025', 5, 3, 5), e('0027', 3, 5, 6)] },
      { name: 'Fuerza B', ex: [e('0043', 3, 3, 5), e('0426', 5, 3, 5), e('0032', 3, 3, 5)] }
    ]
  },
  {
    id: 'perdida-grasa',
    name: 'Fuerza en circuito para perder grasa',
    summary: 'Tres días de fuerza en formato de circuito, con poco descanso y repeticiones moderadas. Se complementa con 150 a 300 minutos de actividad aeróbica a la semana.',
    level: 'Todos', days: 3, weekdays: [1, 3, 5],
    goals: ['fat_loss', 'health', 'endurance'], suits: ['beginner'], avoid: [], focus: 'conditioning',
    basis: 'El aeróbico es lo que más reduce peso y grasa, pero el entrenamiento de fuerza preserva y aumenta la masa magra mientras se pierde peso. Combinar ambos da la mejor recomposición corporal. La OMS recomienda 150 a 300 minutos semanales de actividad moderada más fuerza al menos 2 días. El formato en circuito mantiene alta la demanda cardiovascular.',
    refs: [R.willis2012, R.who2020],
    sessions: [
      { name: 'Circuito A', ex: [e('1760', 3, 12, 15), e('0662', 3, 8, 15), e('0293', 3, 12, 15), e('0549', 3, 15, 20), e('0276', 3, 10, 12)] },
      { name: 'Circuito B', ex: [e('1460', 3, 10, 12), e('0405', 3, 12, 15), e('0861', 3, 12, 15), e('1409', 3, 12, 15), e('0979', 3, 10, 12)] }
    ]
  },
  {
    id: 'gluteo-pierna',
    name: 'Énfasis en glúteo y pierna',
    summary: 'Cuatro días: dos de pierna con énfasis en glúteos (extensión de cadera y trabajo a una pierna) y dos de torso para mantener el equilibrio.',
    level: 'Principiante a intermedio', days: 4, weekdays: [1, 2, 4, 5],
    goals: ['muscle', 'health'], suits: [], avoid: [], focus: 'glutes_legs',
    basis: 'Para priorizar un grupo muscular conviene darle más volumen y frecuencia: el glúteo se entrena dos veces por semana con unas 10 a 20 series, combinando extensión de cadera (puente, bisagra) con trabajo de rodilla y cadera (sentadilla, zancada, subida al cajón). El torso se mantiene con volumen moderado.',
    refs: [R.volume2017, R.freq2016],
    sessions: [
      { name: 'Glúteo y cadena posterior', ex: [e('1409', 4, 8, 12), e('0085', 3, 8, 10), e('0431', 3, 10, 12), e('0586', 3, 10, 12), e('0196', 3, 12, 15)] },
      { name: 'Torso A', ex: [e('0289', 3, 8, 12), e('0861', 3, 10, 12), e('0405', 3, 10, 12), e('2330', 3, 10, 12)] },
      { name: 'Glúteo y cuádriceps', ex: [e('1760', 4, 8, 12), e('0336', 3, 10, 12), e('1409', 3, 12, 15), e('2287', 3, 10, 12), e('1373', 3, 12, 15)] },
      { name: 'Torso B', ex: [e('0314', 3, 8, 12), e('0292', 3, 10, 12), e('0334', 3, 12, 15), e('0201', 2, 10, 12), e('1648', 2, 10, 12)] }
    ]
  },
  {
    id: 'rodilla-cuidada',
    name: 'Rodilla cuidada',
    summary: 'Tres días que fortalecen cadera y rodilla con ejercicios de bajo impacto, en rangos tolerables y sin saltos.',
    level: 'Todos', days: 3, weekdays: [1, 3, 5],
    goals: ['health', 'strength', 'muscle'], suits: ['knee', 'beginner'], avoid: [], focus: 'full_body',
    basis: 'En el dolor patelofemoral, el consenso internacional recomienda ejercicio terapéutico que combine fortalecimiento de cadera y de rodilla, porque reduce el dolor y mejora la función a corto, medio y largo plazo. Se priorizan la extensión de cadera, la subida a un cajón bajo y la sentadilla goblet hasta donde no haya dolor, y se evitan los saltos.',
    refs: [R.crossley2016, R.acsm2009],
    sessions: [
      { name: 'Cadera y rodilla A', ex: [e('3013', 3, 12, 15), e('0431', 3, 8, 12), e('1760', 3, 8, 12), e('0586', 3, 10, 12), e('0861', 3, 10, 12), e('0405', 3, 10, 12)] },
      { name: 'Cadera y rodilla B', ex: [e('1409', 3, 10, 12), e('2287', 3, 10, 12), e('1459', 3, 8, 12), e('0585', 2, 12, 15), e('2330', 3, 10, 12), e('0289', 3, 8, 12)] }
    ]
  },
  {
    id: 'espalda-cuidada',
    name: 'Espalda baja cuidada',
    summary: 'Tres días de fuerza general con columna neutra: estabilidad del tronco, bisagra ligera aprendida con control y tracciones con el pecho apoyado.',
    level: 'Todos', days: 3, weekdays: [1, 3, 5],
    goals: ['health', 'strength'], suits: ['lower_back', 'beginner'], avoid: [], focus: 'full_body',
    basis: 'Las guías clínicas recomiendan el ejercicio como parte del manejo del dolor lumbar. El trabajo de estabilidad con columna neutra (dead bug, anti-rotación) y aprender la bisagra con poca carga reducen el estrés sobre la columna y mejoran su tolerancia, mientras los apoyos (remo en máquina, prensa) permiten entrenar fuerte sin cargarla.',
    refs: [R.nice2016, R.mcgill],
    sessions: [
      { name: 'Tronco y fuerza A', ex: [e('0276', 3, 8, 10), e('0979', 3, 10, 12), e('0196', 3, 12, 15), e('2287', 3, 10, 12), e('1350', 3, 10, 12), e('0577', 3, 10, 12)] },
      { name: 'Tronco y fuerza B', ex: [e('3013', 3, 12, 15), e('0276', 3, 8, 10), e('1459', 2, 10, 12), e('0431', 3, 8, 12), e('0292', 3, 10, 12), e('0405', 3, 10, 12)] }
    ]
  },
  {
    id: 'casa',
    name: 'En casa sin equipo',
    summary: 'Tres días con peso corporal y una banda elástica. La progresión se logra con más repeticiones y variantes más difíciles.',
    level: 'Principiante a intermedio', days: 3, weekdays: [1, 3, 5],
    goals: ['health', 'muscle', 'fat_loss'], suits: ['no_gym', 'beginner'], avoid: [], focus: 'full_body',
    basis: 'Entrenando cerca del fallo, las cargas bajas con muchas repeticiones producen una hipertrofia similar a la de las cargas altas; la fuerza máxima, en cambio, mejora más con cargas altas. Por eso, sin pesas se puede ganar músculo si cada serie se acerca al fallo y se progresa en repeticiones o en la dificultad de la variante.',
    refs: [R.loads2017, R.acsm2009],
    sessions: [
      { name: 'Casa A', ex: [e('1004', 3, 12, 20), e('0662', 3, 6, 15), e('0499', 3, 6, 12), e('3013', 3, 15, 20), e('0276', 3, 8, 12)] },
      { name: 'Casa B', ex: [e('1460', 3, 10, 16), e('0493', 3, 10, 20), e('0988', 3, 12, 15), e('0431', 3, 10, 12), e('0979', 3, 10, 12)] }
    ]
  },
  {
    id: 'salud-60',
    name: 'Salud y autonomía (60+)',
    summary: 'Dos o tres días de fuerza para todo el cuerpo, con ejercicios estables, carga moderada y trabajo de piernas para la marcha y el equilibrio.',
    level: 'Principiante', days: 2, weekdays: [2, 5],
    goals: ['health'], suits: ['beginner', 'knee', 'lower_back'], avoid: [], focus: 'full_body',
    basis: 'En personas mayores, la NSCA recomienda fuerza 2 o 3 días por semana para todos los grandes grupos musculares, con progresión individualizada, porque mejora la fuerza, la masa muscular, la funcionalidad y reduce el riesgo de caídas. La OMS añade fuerza al menos 2 días y ejercicios de equilibrio para mayores de 65 años.',
    refs: [R.fragala2019, R.who2020],
    sessions: [
      { name: 'Autonomía A', ex: [e('1760', 2, 8, 12), e('0577', 2, 10, 12), e('1350', 2, 10, 12), e('0431', 2, 8, 10), e('1373', 2, 10, 15)] },
      { name: 'Autonomía B', ex: [e('2287', 2, 10, 12), e('2330', 2, 10, 12), e('0405', 2, 10, 12), e('3013', 2, 10, 15), e('0979', 2, 10, 12)] }
    ]
  }
]

/** How well a model fits a client profile: goal match, focus match, and no clash with their
 *  limitations (a model that avoids one of them is dropped). Higher is better; null = unsuitable. */
export function fitScore(p, profile) {
  if (!profile) return 0
  const limits = profile.limits || []
  if (limits.some(l => p.avoid.includes(l))) return null
  let s = 0
  if (profile.goal && p.goals.includes(profile.goal)) s += p.goals[0] === profile.goal ? 3 : 2
  if (profile.focus && p.focus === profile.focus) s += 2
  s += limits.filter(l => p.suits.includes(l)).length * 2
  if (profile.days && Math.abs(profile.days - p.days) <= 1) s += 1
  return s
}

/** Lays a model over the calendar: sessions rotate A, B, C… on the chosen weekdays from `start`
 *  for `weeks` weeks. Returns [{ date, name, ex, note }] ready for the batch call. */
export function layOut(program, { start, weeks, weekdays, note = '' }) {
  const out = []
  const d0 = new Date(start + 'T12:00:00')
  const days = weeks * 7
  let k = 0
  for (let i = 0; i < days; i++) {
    const d = new Date(d0.getTime() + i * 86400000)
    if (!weekdays.includes(d.getDay())) continue
    const s = program.sessions[k % program.sessions.length]
    k++
    out.push({ date: d.toISOString().slice(0, 10), name: s.name, note, ex: s.ex.map(x => ({ ...x })) })
  }
  return out
}
