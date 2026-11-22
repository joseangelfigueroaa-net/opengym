// Training models a trainer can lay over a client's month (Trainnery).
//
// Each model says what it is for (goal), who it suits or protects (limitations), how the week is
// split (focus), and WHY it is built that way — a short rationale with the research or position
// stand behind it, so a trainer can explain the plan to a client and judge whether it fits.
// Exercise ids are the app's library (lib/exercises-data.js); every exercise used here also
// carries a one-line note on what it trains and why it earns its place.
//
// `concepts` points at the knowledge area (lib/knowledge.js) entries each model rests on.
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

// The method a model is built on, as the reference books classify them (lib/knowledge.js):
// what kind of work its exercises must be, and the rest that goes with it by default.
// `modes` and the rep window are checked against every model in programs.test.js, so an
// exercise that does not belong to its method cannot slip in.
export const METHODS = {
  salud: { name: 'Acondicionamiento general', rest: 75, modes: ['reps', 'time'], reps: [8, 25],
    about: 'Desarrollo multilateral de todas las capacidades con cargas moderadas; la base sobre la que luego se especializa.' },
  hipertrofia: { name: 'Hipertrofia', rest: 90, modes: ['reps'], reps: [6, 20],
    about: 'Casi cualquier rango de 6 a 30 repeticiones hace crecer el músculo si la serie termina cerca del fallo; 6 a 12 es el más eficiente en tiempo. Lo que más pesa es el volumen semanal por músculo (unas 10 series o más) y descansar al menos 60 a 90 segundos entre series.' },
  fuerza_maxima: { name: 'Fuerza máxima', rest: 180, modes: ['reps'], reps: [1, 6],
    about: 'Cargas altas, pocas repeticiones y recuperación completa entre series (método de repeticiones).' },
  fuerza_resistencia: { name: 'Fuerza resistencia en circuito', rest: 30, modes: ['reps', 'time'], reps: [10, 25],
    about: 'Muchas repeticiones con poca pausa entre ejercicios: alta densidad y demanda cardiovascular.' },
  potencia: { name: 'Fuerza velocidad (potencia)', rest: 120, modes: ['reps'], reps: [3, 10],
    about: 'Movimientos rápidos y explosivos con cargas moderadas (30 a 70 % de 1RM), poco volumen y siempre sin llegar a la fatiga.' },
  interval: { name: 'Interválico', rest: 90, modes: ['cardio'],
    about: 'Bloques de trabajo intenso con pausas fijas e incompletas: cortos (menos de 1,5 min), medios (1,5 a 6) o largos (6 a 20).' },
  continuo: { name: 'Continuo y fartlek', rest: 0, modes: ['cardio'],
    about: 'Trabajo aeróbico sin pausas, a ritmo uniforme o con cambios de ritmo (fartlek).' },
  terapeutico: { name: 'Ejercicio terapéutico', rest: 75, modes: ['reps', 'time'], reps: [8, 20],
    about: 'Fortalecimiento con rangos y cargas tolerables para una zona sensible, priorizando el control.' },
  hibrido: { name: 'Fuerza y resistencia concurrente (híbrido)', rest: 60, modes: ['reps', 'time', 'cardio'], reps: [5, 20],
    about: 'Fuerza, estaciones funcionales y trabajo aeróbico en la misma semana, en días separados para que una cualidad no le reste a la otra.' },
  movilidad: { name: 'Movilidad y control articular', rest: 45, modes: ['reps', 'time'], reps: [3, 15],
    about: 'Rango de movimiento activo y controlado: rotaciones articulares lentas, contracciones al final del rango y fuerza en todo el recorrido. Inspirado en FRC y DNS; su evidencia es menor que la del entrenamiento de fuerza.' }
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
  fragala2019: { text: 'Fragala et al. (2019). Resistance training for older adults: position statement from the NSCA. J Strength Cond Res 33(8):2019-2052.', url: 'https://pubmed.ncbi.nlm.nih.gov/31343601/' },
  acsm2026: { text: 'Phillips et al. / ACSM (2026). Resistance training prescription for muscle function, hypertrophy, and physical performance in healthy adults: an overview of reviews. Med Sci Sports Exerc (abril 2026). Actualiza la postura de 2009.', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12965823/' },
  continuum2021: { text: 'Schoenfeld, Grgic, Van Every y Plotkin (2021). Loading recommendations for muscle strength, hypertrophy, and local endurance: a re-examination of the repetition continuum. Sports 9(2):32.', url: 'https://doi.org/10.3390/sports9020032' },
  rest2024: { text: 'Singer et al. (2024). Give it a rest: a systematic review with Bayesian meta-analysis on the effect of inter-set rest interval duration on muscle hypertrophy. Front Sports Act Living 6:1429789.', url: 'https://pubmed.ncbi.nlm.nih.gov/39205815/' },
  pfp2018: { text: 'Collins et al. (2018). 2018 Consensus statement on exercise therapy and physical interventions to treat patellofemoral pain. Br J Sports Med 52(18):1170-1178.', url: 'https://doi.org/10.1136/bjsports-2018-099397' },
  pfp2024: { text: 'Neal, Lack, Bartholomew y Morrissey (2024). Best practice guide for patellofemoral pain based on synthesis of a systematic review, the patient voice and expert clinical reasoning. Br J Sports Med 58(24):1486-1495.', url: 'https://doi.org/10.1136/bjsports-2024-108110' },
  whoLbp2023: { text: 'OMS (2023). WHO guideline for non-surgical management of chronic primary low back pain in adults in primary and community care settings.', url: 'https://www.who.int/publications/i/item/9789240081789' },
  hiitVo2: { text: 'Milanović, Sporiš y Weston (2015). Effectiveness of high-intensity interval training (HIT) and continuous endurance training for VO2max improvements: a systematic review and meta-analysis of controlled trials. Sports Med 45(10):1469-1481.', url: 'https://doi.org/10.1007/s40279-015-0365-0' },
  hiitFat: { text: 'Wewege et al. (2017). The effects of high-intensity interval training vs. moderate-intensity continuous training on body composition in overweight and obese adults: a systematic review and meta-analysis. Obes Rev 18(6):635-646.', url: 'https://pubmed.ncbi.nlm.nih.gov/28401638/' },
  schumann2022: { text: 'Schumann et al. (2022). Compatibility of concurrent aerobic and strength training for skeletal muscle size and function: an updated systematic review and meta-analysis. Sports Med 52(3):601-612.', url: 'https://pubmed.ncbi.nlm.nih.gov/34757594/' },
  liftmor2018: { text: 'Watson et al. (2018). High-intensity resistance and impact training improves bone mineral density and physical function in postmenopausal women with osteopenia and osteoporosis: the LIFTMOR randomized controlled trial. J Bone Miner Res 33(2):211-220.', url: 'https://pubmed.ncbi.nlm.nih.gov/28975661/' },
  refalo2023: { text: 'Refalo et al. (2023). Influence of resistance training proximity-to-failure on skeletal muscle hypertrophy: a systematic review with meta-analysis. Sports Med 53(3):649-665.', url: 'https://pubmed.ncbi.nlm.nih.gov/36334240/' },
  lesmillsGlp1: { text: 'Les Mills y ukactive (2026). GLP-1 report: exercise and weight-loss medication.', url: 'https://lesmills.com/articles/glp1-report' },
  volume2019: { text: 'Schoenfeld et al. (2019). Resistance training volume enhances muscle hypertrophy but not strength in trained men. Med Sci Sports Exerc 51(1):94-103.', url: 'https://pubmed.ncbi.nlm.nih.gov/30153194/' },
  failure2022: { text: 'Grgic, Schoenfeld, Orazem y Sabol (2022). Effects of resistance training performed to repetition failure or non-failure on muscular strength and hypertrophy: a systematic review and meta-analysis. J Sport Health Sci 11(2):202-211.', url: 'https://doaj.org/article/dc36ba7ccd994798964f66b93bd8f662' },
  rest2016: { text: 'Schoenfeld et al. (2016). Longer interset rest periods enhance muscle strength and hypertrophy in resistance-trained men. J Strength Cond Res 30(7):1805-1812.', url: 'https://pubmed.ncbi.nlm.nih.gov/26605807/' },
  strVsStretch2021: { text: 'Afonso et al. (2021). Strength training versus stretching for improving range of motion: a systematic review and meta-analysis. Healthcare 9(4):427.', url: 'https://pubmed.ncbi.nlm.nih.gov/33917036/' },
  dns2013: { text: 'Frank, Kobesova y Kolář (2013). Dynamic neuromuscular stabilization and sports rehabilitation. Int J Sports Phys Ther 8(1):62-73.', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3578435/' },
  dnsReview2024: { text: 'Revisión de alcance (2024) sobre la eficacia de la estabilización neuromuscular dinámica (DNS) como estrategia de estabilización de la columna.', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11609563/' },
  aceCars: { text: 'ACE (2024). Controlled articular rotations: shifting mobility into high gear (sobre las rotaciones articulares de Functional Range Conditioning).', url: 'https://www.acefitness.org/continuing-education/certified/october-2024/8725/controlled-articular-rotations-shifting-mobility-into-high-gear/' },
  acsmTrends2026: { text: 'ACSM (2026). Top fitness trends for 2026 (n.º 5: equilibrio, flujo y fuerza del core).', url: 'https://acsm.org/top-fitness-trends-2026' }
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
  '1004': 'Sentadilla con banda: patrón de sentadilla con resistencia elástica para entrenar en casa.',
  '0685': 'Carrera: el medio más natural de resistencia aeróbica; la velocidad y la duración se ajustan con precisión.',
  '2138': 'Bicicleta estática: trabajo aeróbico o interválico sin impacto, amable con rodillas y peso alto.',
  '2612': 'Cuerda: intervalos cortos de alta intensidad; también coordinación y rigidez del tobillo.',
  '2135': 'Plancha con carga: estabilidad del tronco en tiempo; resiste la extensión de la columna.',
  '0514': 'Salto con sentadilla: potencia de piernas; aterrizar suave y detenerse antes de perder calidad.',
  '1312': 'Lanzamiento de balón medicinal al pecho: potencia de empuje sin frenar el movimiento al final.',
  '1700': 'Push press con mancuernas: empuje vertical explosivo que transfiere la fuerza de las piernas a los brazos.',
  '2133': 'Paseo del granjero: caminar con peso en las manos; agarre, tronco y piernas a la vez. Es una de las estaciones típicas de las carreras híbridas.',
  '0550': 'Thruster con kettlebell: sentadilla frontal que termina en press; todo el cuerpo y mucha demanda cardiovascular. Sustituye al lanzamiento de balón a la pared.',
  '1160': 'Burpee: bajar al suelo, subir y saltar; trabajo de todo el cuerpo que dispara la frecuencia cardíaca, sin equipo.',
  '0628': 'Paso de monstruo: caminar con las piernas separadas contra resistencia; glúteo medio, estabilidad de cadera y rodilla.',
  '0705': 'Plancha lateral: estabilidad lateral del tronco (oblicuos y cuadrado lumbar) con la columna neutra.',
  '1774': 'Plancha lateral con abducción de cadera: suma el glúteo medio a la plancha lateral; equilibrio de cadera y tronco.',
  '0308': 'Aperturas con mancuernas: pecho en posición estirada con poca carga; suma volumen de pecho sin cargar más el hombro ni el tríceps.',
  '1403': 'Cuello: inclinaciones y giros lentos, en todo el rango que no moleste; como rotación articular, la cabeza dibuja el círculo más grande posible sin mover los hombros.',
  '2143': 'Círculo de hombros con mancuerna ligera: rotación articular del hombro en todo su rango, lenta y con el tronco quieto.',
  '1358': 'Apertura de tórax de lado: rotación de la columna torácica con la cadera fija; mejora el giro sin forzar la zona lumbar.',
  '1604': 'Estiramiento más grande del mundo: zancada con giro de tronco; cadera, aductores y columna torácica en un solo movimiento.',
  '1368': 'Círculos de tobillo: rotación articular del tobillo; prepara la sentadilla y el apoyo a una pierna.',
  '1428': 'Círculos de muñeca: rotación articular de la muñeca antes de apoyos y empujes.',
  '0984': 'Rotación interna de cadera tumbado con banda: control activo de la cadera al final de su rango, la idea de las contracciones al final del rango (PAILs y RAILs).',
  '2567': 'Estiramiento de piriforme sentado: postura tipo 90/90 para la rotación de cadera; se sostiene y se empuja suave contra el suelo al final del rango.',
  '0864': 'Rotación externa de hombro de pie con mancuerna: manguito rotador y control del hombro en rotación.',
  '1757': 'Peso muerto a una pierna con mancuerna: bisagra de cadera sobre un pie; isquios, glúteo y sobre todo equilibrio.'
}

/* ---------- helpers to keep the sessions readable ---------- */
const e = (id, sets, repsMin, reps, more) => ({ id, mode: 'reps', sets, repsMin, reps, ...more })
const tm = (id, sets, sec, more) => ({ id, mode: 'time', sets, sec, ...more })          // timed hold
const cd = (id, sets, min, more) => ({ id, mode: 'cardio', sets, min, ...more })        // cardio block

/* ---------- the models ---------- */
export const PROGRAMS = [
  {
    id: 'fundamentos', method: 'salud', books: ['b06', 'b12'],
    concepts: ['multilateralidad', 'progresion', 'sobrecarga', 'supercompensacion'],
    name: 'Fundamentos de cuerpo completo',
    summary: 'Dos sesiones (A y B) alternadas, 3 días por semana, con los patrones básicos: sentadilla, bisagra, empuje y tracción.',
    level: 'Principiante', days: 3, weekdays: [1, 3, 5],
    goals: ['health', 'strength', 'muscle'], suits: ['beginner'], avoid: [], focus: 'full_body',
    basis: 'Para quien empieza, la postura del ACSM de 2026 (que revisó 137 revisiones sistemáticas) resume lo esencial: cualquier entrenamiento de fuerza es mejor que ninguno, y lo importante es trabajar todos los grandes grupos musculares al menos 2 veces por semana. Para principiantes funcionan 1 a 3 series de 8 a 12 repeticiones con sobrecarga progresiva. Repetir los mismos patrones varias veces por semana acelera el aprendizaje técnico, y alternar A y B reparte la fatiga.',
    refs: [R.acsm2026, R.acsm2009, R.acsm2011],
    sessions: [
      { name: 'Cuerpo completo A', ex: [e('1760', 3, 8, 12), e('0289', 3, 8, 12), e('0861', 3, 8, 12), e('1459', 2, 8, 12), e('0276', 2, 8, 12)] },
      { name: 'Cuerpo completo B', ex: [e('2287', 3, 10, 12), e('2330', 3, 8, 12), e('0405', 3, 8, 12), e('3013', 2, 10, 15), e('0979', 2, 10, 12)] }
    ]
  },
  {
    id: 'torso-pierna', method: 'hipertrofia', books: ['b01', 'b09'],
    concepts: ['componentes-carga', 'especificidad', 'supercompensacion', 'progresion', 'hipertrofia-evidencia'],
    name: 'Torso / pierna para hipertrofia',
    summary: 'Cuatro días: dos de torso y dos de pierna. Cada músculo se entrena dos veces por semana con 6 a 12 repeticiones.',
    level: 'Intermedio', days: 4, weekdays: [1, 2, 4, 5],
    goals: ['muscle', 'strength'], suits: [], avoid: ['beginner'], focus: 'upper_lower',
    basis: 'Entrenar cada grupo muscular al menos dos veces por semana produce más hipertrofia que hacerlo una sola vez, y la ganancia muscular crece con el volumen semanal (Schoenfeld, 2017 y 2019): la postura del ACSM de 2026 apunta a unas 10 series o más por músculo, y este modelo da 10 a 17 a pecho, espalda, cuádriceps y glúteos, mientras hombros y brazos suman además el trabajo indirecto de los ejercicios compuestos. No hace falta llegar al fallo en cada serie: quedarse a 1 a 3 repeticiones da resultados parecidos con menos fatiga (Grgic y Schoenfeld, 2022). Repartido en torso y pierna se alcanza ese volumen sin sesiones eternas, con 2 a 3 minutos de descanso en los ejercicios grandes, que en el estudio de Schoenfeld (2016) dieron más fuerza y más músculo que 1 minuto.',
    refs: [R.acsm2026, R.freq2016, R.volume2017, R.volume2019, R.failure2022, R.rest2016, R.rest2024],
    sessions: [
      { name: 'Torso: fuerza', ex: [e('0025', 4, 6, 8), e('0027', 4, 6, 8), e('0405', 3, 8, 10), e('2330', 3, 8, 10), e('0201', 3, 10, 12)] },
      { name: 'Pierna: cuádriceps', ex: [e('0043', 4, 6, 8), e('2287', 3, 10, 12), e('0336', 3, 8, 10), e('0585', 3, 12, 15), e('1373', 3, 12, 15)] },
      { name: 'Torso: volumen', ex: [e('0314', 4, 8, 12), e('0861', 3, 10, 12), e('0308', 3, 10, 15), e('0334', 3, 12, 15), e('0292', 3, 10, 12), e('0031', 3, 10, 12)] },
      { name: 'Pierna: cadena posterior', ex: [e('0085', 4, 6, 10), e('1409', 3, 8, 12), e('0586', 3, 10, 12), e('0431', 3, 10, 12), e('0979', 3, 10, 12)] }
    ]
  },
  {
    id: 'empuje-jalon-pierna', method: 'hipertrofia', books: ['b01', 'b09'],
    concepts: ['componentes-carga', 'recuperacion', 'supercompensacion', 'hipertrofia-evidencia'],
    name: 'Empuje / jalón / pierna',
    summary: 'Tres sesiones especializadas que se repiten dos veces por semana (6 días) o una vez (3 días) según el tiempo del cliente.',
    level: 'Intermedio a avanzado', days: 6, weekdays: [1, 2, 3, 4, 5, 6],
    goals: ['muscle'], suits: [], avoid: ['beginner'], focus: 'push_pull_legs',
    basis: 'Agrupar los músculos por función (empuje, jalón, pierna) permite mucho volumen por sesión con buena recuperación entre días. Hecho 6 días, cada músculo recibe dos estímulos por semana, que es lo que recomienda la postura del ACSM de 2026; con 3 días sigue funcionando, pero conviene subir las series por sesión para mantener unas 10 o más por músculo a la semana.',
    refs: [R.acsm2026, R.volume2017, R.volume2019, R.freq2016],
    sessions: [
      { name: 'Empuje', ex: [e('0025', 4, 6, 10), e('0405', 3, 8, 10), e('0314', 3, 8, 12), e('0334', 3, 12, 15), e('0201', 3, 10, 12)] },
      { name: 'Jalón', ex: [e('0652', 3, 6, 10), e('0027', 4, 6, 10), e('0861', 3, 10, 12), e('0993', 3, 12, 15), e('1648', 3, 10, 12)] },
      { name: 'Pierna', ex: [e('0043', 4, 6, 10), e('0085', 3, 8, 10), e('2287', 3, 10, 12), e('0586', 3, 10, 12), e('0417', 3, 12, 15)] }
    ]
  },
  {
    id: 'fuerza-basica', method: 'fuerza_maxima', books: ['b07', 'b09'],
    concepts: ['especificidad', 'fuerza', 'recuperacion', 'energia'],
    name: 'Fuerza con básicos',
    summary: 'Tres días de cuerpo completo con los grandes levantamientos en rangos bajos (3 a 6 repeticiones), pocos ejercicios y descansos largos.',
    level: 'Intermedio', days: 3, weekdays: [1, 3, 5],
    goals: ['strength'], suits: [], avoid: ['beginner', 'lower_back', 'knee'], focus: 'full_body',
    basis: 'La fuerza máxima responde mejor a cargas altas (aproximadamente 80 % de 1RM o más, 1 a 6 repeticiones) con 2 a 5 minutos de descanso. Para la mayoría de los adultos bastan 2 o 3 series por ejercicio (ACSM, 2026); las 4 o 5 series de este modelo son para quien ya entrena y quiere progresar más. Por el principio de especificidad, mejora más lo que se entrena: practicar los mismos levantamientos con frecuencia. Con el mismo volumen, la frecuencia semanal importa menos para la fuerza, así que 3 días bastan.',
    refs: [R.acsm2026, R.loads2017, R.freqStr2018, R.acsm2009],
    sessions: [
      { name: 'Fuerza A', ex: [e('0043', 5, 3, 5), e('0025', 5, 3, 5), e('0027', 3, 5, 6)] },
      { name: 'Fuerza B', ex: [e('0043', 3, 3, 5), e('0426', 5, 3, 5), e('0032', 3, 3, 5)] }
    ]
  },
  {
    id: 'perdida-grasa', method: 'fuerza_resistencia', books: ['b09', 'b02'],
    concepts: ['metodos', 'componentes-carga', 'energia'],
    name: 'Fuerza en circuito para perder grasa',
    summary: 'Tres días de fuerza en formato de circuito, con poco descanso y repeticiones moderadas. Se complementa con 150 a 300 minutos de actividad aeróbica a la semana.',
    level: 'Todos', days: 3, weekdays: [1, 3, 5],
    goals: ['fat_loss', 'health', 'endurance'], suits: ['beginner'], avoid: [], focus: 'conditioning',
    basis: 'El aeróbico es lo que más reduce peso y grasa, pero el entrenamiento de fuerza preserva y aumenta la masa magra mientras se pierde peso; combinar ambos da la mejor recomposición corporal. La OMS recomienda 150 a 300 minutos semanales de actividad moderada más fuerza al menos 2 días. El formato en circuito mantiene alta la demanda cardiovascular, y caminar los demás días completa los minutos de actividad.',
    refs: [R.willis2012, R.who2020, R.acsm2026],
    sessions: [
      { name: 'Circuito A', ex: [e('1760', 3, 12, 15), e('0662', 3, 10, 15), e('0293', 3, 12, 15), e('0549', 3, 15, 20), e('0276', 3, 10, 12)] },
      { name: 'Circuito B', ex: [e('1460', 3, 10, 12), e('0405', 3, 12, 15), e('0861', 3, 12, 15), e('1409', 3, 12, 15), e('0979', 3, 10, 12)] }
    ]
  },
  {
    id: 'gluteo-pierna', method: 'hipertrofia', books: ['b01'],
    concepts: ['componentes-carga', 'especificidad', 'individualidad', 'hipertrofia-evidencia'],
    name: 'Énfasis en glúteo y pierna',
    summary: 'Cuatro días: dos de pierna con énfasis en glúteos (extensión de cadera y trabajo a una pierna) y dos de torso para mantener el equilibrio.',
    level: 'Principiante a intermedio', days: 4, weekdays: [1, 2, 4, 5],
    goals: ['muscle', 'health'], suits: [], avoid: [], focus: 'glutes_legs',
    basis: 'Para priorizar un grupo muscular conviene darle más volumen y frecuencia: el glúteo se entrena dos veces por semana con unas 10 a 20 series, combinando extensión de cadera (puente, bisagra) con trabajo de rodilla y cadera (sentadilla, zancada, subida al cajón). El torso se mantiene con volumen moderado, unas 6 a 10 series por músculo a la semana: menos de lo ideal para crecer, pero suficiente para mantener y seguir ganando algo (Schoenfeld, 2017), mientras el volumen grande va al glúteo.',
    refs: [R.volume2017, R.freq2016, R.acsm2026],
    sessions: [
      { name: 'Glúteo y cadena posterior', ex: [e('1409', 4, 8, 12), e('0085', 3, 8, 10), e('0431', 3, 10, 12), e('0586', 3, 10, 12), e('0196', 3, 12, 15)] },
      { name: 'Torso A', ex: [e('0289', 3, 8, 12), e('0861', 3, 10, 12), e('0405', 3, 10, 12), e('2330', 3, 10, 12)] },
      { name: 'Glúteo y cuádriceps', ex: [e('1760', 4, 8, 12), e('0336', 3, 10, 12), e('1409', 3, 12, 15), e('2287', 3, 10, 12), e('1373', 3, 12, 15)] },
      { name: 'Torso B', ex: [e('0314', 3, 8, 12), e('0292', 3, 10, 12), e('0334', 3, 12, 15), e('0201', 2, 10, 12), e('1648', 2, 10, 12)] }
    ]
  },
  {
    id: 'rodilla-cuidada', method: 'terapeutico', books: ['b12'],
    concepts: ['individualidad', 'sobrecarga', 'progresion'],
    name: 'Rodilla cuidada',
    summary: 'Tres días que fortalecen cadera y rodilla con ejercicios de bajo impacto, en rangos tolerables y sin saltos.',
    level: 'Todos', days: 3, weekdays: [1, 3, 5],
    goals: ['health', 'strength', 'muscle'], suits: ['knee', 'beginner'], avoid: [], focus: 'full_body',
    basis: 'En el dolor patelofemoral (dolor alrededor de la rótula), el consenso internacional de 2018 y la guía de buena práctica de 2024 coinciden: el tratamiento principal es el ejercicio, combinando fortalecimiento de cadera y de rodilla, acompañado de educación sobre cómo dosificar la carga. Reduce el dolor y mejora la función. Se priorizan la extensión de cadera, la subida a un cajón bajo y la sentadilla goblet hasta donde no haya dolor, y se evitan los saltos al principio. Un dolor leve (hasta 3 de 10) que se calma al día siguiente es aceptable.',
    refs: [R.pfp2018, R.pfp2024, R.acsm2026],
    sessions: [
      { name: 'Cadera y rodilla A', ex: [e('3013', 3, 12, 15), e('0431', 3, 8, 12), e('1760', 3, 8, 12), e('0586', 3, 10, 12), e('0861', 3, 10, 12), e('0405', 3, 10, 12)] },
      { name: 'Cadera y rodilla B', ex: [e('1409', 3, 10, 12), e('2287', 3, 10, 12), e('1459', 3, 8, 12), e('0585', 2, 12, 15), e('2330', 3, 10, 12), e('0289', 3, 8, 12)] }
    ]
  },
  {
    id: 'espalda-cuidada', method: 'terapeutico', books: ['b12'],
    concepts: ['individualidad', 'progresion', 'pedagogicos'],
    name: 'Espalda baja cuidada',
    summary: 'Tres días de fuerza general con columna neutra: estabilidad del tronco, bisagra ligera aprendida con control y tracciones con el pecho apoyado.',
    level: 'Todos', days: 3, weekdays: [1, 3, 5],
    goals: ['health', 'strength'], suits: ['lower_back', 'beginner'], avoid: [], focus: 'full_body',
    basis: 'Las guías clínicas (NICE y la guía de la OMS de 2023 para el dolor lumbar crónico) recomiendan el ejercicio estructurado como parte del tratamiento. El trabajo de estabilidad con columna neutra (dead bug, anti-rotación) y aprender la bisagra con poca carga reducen el estrés sobre la columna y mejoran su tolerancia, mientras los apoyos (remo en máquina, prensa) permiten entrenar fuerte sin cargarla. Ante dolor que baja por la pierna, hormigueo o pérdida de fuerza, primero lo debe ver un médico.',
    refs: [R.whoLbp2023, R.nice2016, R.mcgill],
    sessions: [
      { name: 'Tronco y fuerza A', ex: [e('0276', 3, 8, 10), e('0979', 3, 10, 12), e('0196', 3, 12, 15), e('2287', 3, 10, 12), e('1350', 3, 10, 12), e('0577', 3, 10, 12)] },
      { name: 'Tronco y fuerza B', ex: [e('3013', 3, 12, 15), e('0276', 3, 8, 10), e('1459', 2, 10, 12), e('0431', 3, 8, 12), e('0292', 3, 10, 12), e('0405', 3, 10, 12)] }
    ]
  },
  {
    id: 'casa', method: 'hipertrofia', books: ['b06'],
    concepts: ['sobrecarga', 'progresion', 'especificidad', 'hipertrofia-evidencia'],
    name: 'En casa sin equipo',
    summary: 'Tres días con peso corporal y una banda elástica. La progresión se logra con más repeticiones y variantes más difíciles.',
    level: 'Principiante a intermedio', days: 3, weekdays: [1, 3, 5],
    goals: ['health', 'muscle', 'fat_loss'], suits: ['no_gym', 'beginner'], avoid: [], focus: 'full_body',
    basis: 'Entrenando cerca del fallo, las cargas bajas con muchas repeticiones producen una hipertrofia similar a la de las cargas altas; la fuerza máxima, en cambio, mejora más con cargas altas. La postura del ACSM de 2026 confirma que el peso corporal y las bandas dan ganancias reales de fuerza, músculo y función. Por eso, sin pesas se puede ganar músculo si cada serie se acerca al fallo y se progresa en repeticiones o en la dificultad de la variante.',
    refs: [R.loads2017, R.continuum2021, R.acsm2026],
    sessions: [
      { name: 'Casa A', ex: [e('1004', 3, 12, 20), e('0662', 3, 6, 15), e('0499', 3, 6, 12), e('3013', 3, 15, 20), e('0276', 3, 8, 12)] },
      { name: 'Casa B', ex: [e('1460', 3, 10, 16), e('0493', 3, 10, 20), e('0988', 3, 12, 15), e('0431', 3, 10, 12), e('0979', 3, 10, 12)] }
    ]
  },
  {
    id: 'salud-60', method: 'salud', books: ['b12', 'b04'],
    concepts: ['mayores', 'individualidad', 'calentamiento'],
    name: 'Salud y autonomía (60+)',
    summary: 'Dos o tres días de fuerza para todo el cuerpo, con ejercicios estables, carga moderada y trabajo de piernas para la marcha y el equilibrio.',
    level: 'Principiante', days: 2, weekdays: [2, 5],
    goals: ['health'], suits: ['beginner', 'knee', 'lower_back'], avoid: [], focus: 'full_body',
    basis: 'En personas mayores, la NSCA recomienda fuerza 2 o 3 días por semana para todos los grandes grupos musculares, con progresión individualizada, porque mejora la fuerza, la masa muscular, la funcionalidad y reduce el riesgo de caídas. La OMS añade, para mayores de 65 años, ejercicios de equilibrio varias veces por semana: la subida al cajón y los ejercicios de pie cumplen esa función, y se puede sumar estar de pie sobre una pierna con apoyo cerca.',
    refs: [R.fragala2019, R.who2020, R.acsm2026],
    sessions: [
      { name: 'Autonomía A', ex: [e('1760', 2, 8, 12), e('0577', 2, 10, 12), e('1350', 2, 10, 12), e('0431', 2, 8, 10), e('1373', 2, 10, 15)] },
      { name: 'Autonomía B', ex: [e('2287', 2, 10, 12), e('2330', 2, 10, 12), e('0405', 2, 10, 12), e('3013', 2, 10, 15), e('0979', 2, 10, 12)] }
    ]
  },
  /* ---------- models built on the methods of the reference books ---------- */
  {
    id: 'intervalico', method: 'interval', books: ['b09', 'b01', 'b02'],
    concepts: ['metodos', 'componentes-carga', 'energia', 'recuperacion'],
    name: 'Método interválico',
    summary: 'Tres días de resistencia con bloques de trabajo intenso y pausas fijas: intervalos cortos, medios y largos, en bicicleta, carrera o cuerda.',
    level: 'Intermedio', days: 3, weekdays: [2, 4, 6],
    goals: ['endurance', 'fat_loss'], suits: ['no_gym'], avoid: ['beginner', 'knee'], focus: 'conditioning',
    basis: 'Los libros clasifican el método interválico por la duración del trabajo: corto (menos de 1,5 minutos, intensidad máxima o alta), medio (1,5 a 6 minutos) y largo (6 a 20 minutos), siempre con pausas predeterminadas e incompletas. Los metaanálisis respaldan su uso: mejora el consumo máximo de oxígeno algo más que el trabajo continuo (Milanović, 2015) y reduce la grasa igual que el continuo con unos 40 % menos de tiempo (Wewege, 2017). Cada sesión cambia la duración para trabajar distintas vías energéticas; no se hacen más de 2 o 3 sesiones intensas por semana.',
    refs: [R.hiitVo2, R.hiitFat],
    sessions: [
      { name: 'Intervalos cortos', ex: [cd('2138', 8, 1, { rest: 90 }), cd('2612', 4, 1, { rest: 60 })] },
      { name: 'Intervalos medios', ex: [cd('0685', 5, 3, { rest: 120 })] },
      { name: 'Intervalos largos', ex: [cd('2138', 3, 8, { rest: 180 })] }
    ]
  },
  {
    id: 'continuo-fartlek', method: 'continuo', books: ['b09', 'b02'],
    concepts: ['metodos', 'componentes-carga', 'energia'],
    name: 'Continuo y fartlek',
    summary: 'Tres días de trabajo aeróbico sin pausas: dos a ritmo uniforme y uno con cambios de ritmo (fartlek), aumentando la duración semana a semana.',
    level: 'Todos', days: 3, weekdays: [1, 3, 5],
    goals: ['endurance', 'fat_loss', 'health'], suits: ['beginner', 'no_gym'], avoid: [], focus: 'conditioning',
    basis: 'El método continuo trabaja sin pausas: uniforme cuando se mantiene el mismo ritmo (hoy se le llama zona 2 cuando el ritmo permite hablar), y variable o fartlek («juego de velocidad») cuando se alternan ritmos sin detenerse. Es la base de la resistencia aeróbica, cumple los 150 a 300 minutos semanales de la OMS y reduce la grasa tanto como el interválico (Wewege, 2017). Se progresa primero en volumen (más minutos) y después en intensidad.',
    refs: [R.who2020, R.hiitFat, R.acsm2011],
    sessions: [
      { name: 'Continuo uniforme', ex: [cd('0685', 1, 30)] },
      { name: 'Fartlek', ex: [cd('0685', 1, 25)] },
      { name: 'Continuo en bicicleta', ex: [cd('2138', 1, 40)] }
    ]
  },
  {
    id: 'fuerza-resistencia', method: 'fuerza_resistencia', books: ['b07', 'b09'],
    concepts: ['fuerza', 'componentes-carga', 'metodos', 'energia'],
    name: 'Fuerza resistencia en circuito',
    summary: 'Tres días de circuito con muchas repeticiones y pausas cortas entre ejercicios; se dan 3 vueltas al circuito.',
    level: 'Principiante a intermedio', days: 3, weekdays: [1, 3, 5],
    goals: ['endurance', 'fat_loss', 'health'], suits: ['beginner', 'no_gym'], avoid: [], focus: 'conditioning',
    basis: 'La fuerza resistencia es la capacidad de mantener un esfuerzo muscular durante mucho tiempo. Se entrena con cargas ligeras (menos del 60 % de 1RM), muchas repeticiones (15 o más) y una densidad alta, es decir, poco descanso respecto al trabajo (Schoenfeld, 2021). El formato en circuito alterna grupos musculares, así uno descansa mientras trabaja el siguiente.',
    refs: [R.continuum2021, R.who2020],
    sessions: [
      { name: 'Circuito A', ex: [e('1760', 3, 15, 20), e('0662', 3, 10, 20), e('0499', 3, 10, 15), e('0431', 3, 12, 15), tm('2135', 3, 30)] },
      { name: 'Circuito B', ex: [e('1460', 3, 12, 20), e('0405', 3, 15, 20), e('0861', 3, 15, 20), e('3013', 3, 15, 25), e('0276', 3, 10, 15)] }
    ]
  },
  {
    id: 'potencia', method: 'potencia', books: ['b07', 'b01'],
    concepts: ['fuerza', 'energia', 'recuperacion', 'especificidad'],
    name: 'Fuerza velocidad (potencia)',
    summary: 'Dos días de movimientos explosivos con pocas repeticiones y pausas largas, combinados con un ejercicio de fuerza para sostener la técnica.',
    level: 'Intermedio a avanzado', days: 2, weekdays: [2, 5],
    goals: ['strength'], suits: [], avoid: ['beginner', 'knee', 'lower_back'], focus: 'full_body',
    basis: 'La fuerza velocidad es producir mucha fuerza en el menor tiempo; su máxima expresión es la potencia. La postura del ACSM de 2026 recomienda cargas moderadas (30 a 70 % de 1RM), poco volumen y mover la carga lo más rápido posible en la fase de subida. Se entrena con pocas repeticiones y recuperación completa, porque depende del sistema de fosfágenos, que se agota en segundos: entrenarla fatigado enseña a moverse lento, justo lo contrario de lo que se busca.',
    refs: [R.acsm2026],
    sessions: [
      { name: 'Potencia de piernas y cadera', ex: [e('0514', 4, 3, 5), e('0549', 4, 8, 10), e('0043', 3, 4, 6, { rest: 180 })] },
      { name: 'Potencia de torso', ex: [e('1312', 4, 4, 6), e('1700', 4, 4, 6), e('0652', 3, 3, 6)] }
    ]
  },
  {
    id: 'hibrido', method: 'hibrido', books: [],
    concepts: ['metodos', 'energia', 'especificidad', 'fatiga'],
    name: 'Híbrido: fuerza y resistencia (estilo HYROX)',
    summary: 'Tres días: uno de fuerza con básicos, uno de estaciones funcionales con carrera entre ellas y uno largo y suave en zona 2.',
    level: 'Intermedio', days: 3, weekdays: [1, 3, 5],
    goals: ['endurance', 'strength', 'fat_loss'], suits: [], avoid: ['beginner', 'knee'], focus: 'conditioning',
    basis: 'El entrenamiento híbrido combina fuerza y resistencia, como piden las carreras tipo HYROX (correr entre estaciones de trineo, remo, zancadas y lanzamientos). La revisión de Schumann (2022, 43 estudios) muestra que hacer las dos cosas no frena la ganancia de músculo ni de fuerza máxima, aunque la fuerza explosiva puede verse afectada si se entrenan en la misma sesión; por eso la fuerza va en su propio día. La mayor parte del trabajo aeróbico es suave (zona 2, se puede hablar mientras se corre): construye la base sin acumular fatiga para los días duros.',
    refs: [R.schumann2022, R.acsm2011],
    sessions: [
      { name: 'Fuerza base', ex: [e('0043', 4, 5, 8, { rest: 150 }), e('0027', 4, 6, 10, { rest: 120 }), e('0336', 3, 8, 12), tm('2133', 3, 40), tm('2135', 3, 40)] },
      { name: 'Estaciones y carrera', ex: [cd('0685', 4, 4, { rest: 60 }), e('0550', 4, 15, 20), e('1460', 4, 12, 20), cd('1160', 4, 1, { rest: 60 }), tm('2133', 4, 45)] },
      { name: 'Zona 2', ex: [cd('0685', 1, 40)] }
    ]
  },
  {
    id: 'glp1-musculo', method: 'salud', books: [],
    concepts: ['fuerza', 'sobrecarga', 'progresion', 'continuidad'],
    name: 'Conservar músculo al bajar de peso (GLP-1)',
    summary: 'Tres días de fuerza de cuerpo completo, con máquinas y cargas que suben poco a poco, para quien baja de peso con medicación o dieta.',
    level: 'Principiante a intermedio', days: 3, weekdays: [1, 3, 5],
    goals: ['fat_loss', 'health', 'muscle'], suits: ['beginner'], avoid: [], focus: 'full_body',
    basis: 'Con los medicamentos GLP-1 (como la semaglutida) una parte importante del peso que se pierde puede ser músculo, no solo grasa. La recomendación de consenso es entrenar fuerza 2 o 3 veces por semana, acumular unos 150 minutos de actividad moderada (caminar sirve) y comer suficiente proteína. Las máquinas permiten cargar con seguridad aunque haya poca energía, y la carga sube en pasos pequeños cuando todas las series llegan al tope de repeticiones. Si aparecen náuseas o mareo, se baja el volumen ese día en lugar de saltarse la sesión.',
    refs: [R.lesmillsGlp1, R.acsm2009, R.who2020],
    sessions: [
      { name: 'Cuerpo completo A', ex: [e('2287', 3, 10, 12), e('0577', 3, 10, 12), e('2330', 3, 10, 12), e('0196', 3, 12, 15), e('1373', 2, 12, 15)] },
      { name: 'Cuerpo completo B', ex: [e('1760', 3, 8, 12), e('1350', 3, 10, 12), e('0405', 3, 10, 12), e('1409', 3, 10, 12), tm('2135', 3, 30)] }
    ]
  },
  {
    id: 'menopausia', method: 'fuerza_maxima', books: [],
    concepts: ['fuerza', 'mayores', 'progresion', 'individualidad'],
    name: 'Fuerza e impacto en perimenopausia y menopausia',
    summary: 'Dos días por semana de básicos pesados (peso muerto, sentadilla, press y dominadas) más saltos de bajo impacto, con supervisión del entrenador.',
    level: 'Principiante a intermedio, con supervisión', days: 2, weekdays: [2, 5],
    goals: ['health', 'strength'], suits: [], avoid: ['knee', 'lower_back'], focus: 'full_body',
    basis: 'En la perimenopausia y después de la menopausia se pierde músculo y hueso más rápido. El ensayo LIFTMOR (Watson, 2018) mostró que dos sesiones semanales de 30 minutos con básicos pesados (5 series de 5 repeticiones a carga alta) y saltos supervisados aumentaron la densidad ósea de columna y cadera, y la función física, en mujeres con hueso bajo, sin lesiones relevantes. Las primeras 2 a 4 semanas se aprende la técnica con cargas cómodas; después la carga sube hasta que 5 repeticiones cuesten de verdad. Los saltos son bajos y con aterrizaje suave.',
    refs: [R.liftmor2018, R.fragala2019],
    sessions: [
      { name: 'Fuerza A', ex: [e('0032', 4, 4, 6), e('0426', 4, 4, 6), e('1326', 3, 3, 6), e('0514', 3, 5, 6)] },
      { name: 'Fuerza B', ex: [e('0043', 4, 4, 6), e('0027', 4, 4, 6), e('0289', 3, 4, 6), e('0514', 3, 5, 6)] }
    ]
  },
  {
    id: 'hipertrofia-eficiente', method: 'hipertrofia', books: [],
    concepts: ['fuerza', 'carga', 'fatiga', 'recuperacion', 'hipertrofia-evidencia'],
    name: 'Hipertrofia eficiente (pocas series, cerca del fallo)',
    summary: 'Tres sesiones cortas de cuerpo completo: 2 series por ejercicio, llevadas a 0 a 2 repeticiones del fallo. Para quien tiene poco tiempo.',
    level: 'Intermedio', days: 3, weekdays: [1, 3, 5],
    goals: ['muscle', 'strength'], suits: [], avoid: ['beginner'], focus: 'full_body',
    basis: 'La tendencia del culturismo actual es entrenar menos series pero más cerca del fallo. El metaanálisis de Refalo (2023) no encontró ventaja en llegar al fallo frente a quedarse cerca: dejar 0 a 2 repeticiones en reserva da resultados similares con menos fatiga. Ojo: el volumen sigue importando (Schoenfeld, 2017), así que este modelo es un mínimo eficaz, no el máximo. Si hay tiempo, añadir una tercera serie a los ejercicios grandes. En los ejercicios de aislamiento la última serie puede hacerse en mini-series (myo-reps): tras la serie, 3 a 5 repeticiones más con 15 segundos de pausa.',
    refs: [R.refalo2023, R.failure2022, R.volume2017, R.freq2016],
    sessions: [
      { name: 'Cuerpo completo A', ex: [e('0043', 2, 6, 10), e('0025', 2, 6, 10), e('2330', 2, 8, 12), e('0085', 2, 8, 12), e('0334', 2, 12, 20)] },
      { name: 'Cuerpo completo B', ex: [e('2287', 2, 8, 12), e('0314', 2, 8, 12), e('1350', 2, 8, 12), e('0586', 2, 10, 15), e('0201', 2, 12, 20)] }
    ]
  },
  {
    id: 'core-equilibrio', method: 'salud', books: [],
    concepts: ['multilateralidad', 'progresion', 'calentamiento'],
    name: 'Core, equilibrio y movilidad (estilo Pilates)',
    summary: 'Dos sesiones de control del tronco, equilibrio a una pierna y glúteo medio, con peso corporal, banda y una mancuerna.',
    level: 'Todos', days: 2, weekdays: [2, 4],
    goals: ['health'], suits: ['beginner', 'lower_back'], avoid: [], focus: 'full_body',
    basis: 'Equilibrio, flujo y fuerza del core está entre las cinco tendencias del ACSM para 2026, y el Pilates con máquina es la clase más reservada del mundo. Este modelo lleva esa idea al piso del gimnasio: trabajo del tronco con la columna neutra (sin abdominales que la flexionen, como recomienda McGill), equilibrio a una pierna y glúteo medio, que estabiliza cadera y rodilla. Sirve sola o como complemento de dos días de fuerza, y cumple con las recomendaciones de la OMS de trabajar el equilibrio y la fuerza varias veces por semana.',
    refs: [R.acsmTrends2026, R.mcgill, R.who2020],
    sessions: [
      { name: 'Tronco y cadera', ex: [e('0276', 3, 8, 12), tm('0705', 3, 30), e('0979', 3, 10, 12), e('3013', 3, 12, 15), e('0628', 3, 12, 15)] },
      { name: 'Equilibrio y control', ex: [e('1757', 3, 8, 12), e('0431', 3, 8, 12), tm('2135', 3, 30), e('0993', 3, 12, 15), e('1774', 3, 10, 15)] }
    ]
  },
  {
    id: 'movilidad', method: 'movilidad', books: [], forMobility: true,
    evidence: 'Práctica clínica; evidencia limitada',
    concepts: ['escuela-praga', 'calentamiento', 'individualidad'],
    name: 'Movilidad y control articular',
    summary: 'Dos sesiones para ganar rango de movimiento que se pueda controlar: rotaciones articulares, trabajo al final del rango, respiración y estabilidad del tronco, y fuerza en todo el recorrido.',
    level: 'Todos', days: 2, weekdays: [2, 4],
    goals: ['health'], suits: ['beginner', 'lower_back'], avoid: [], focus: 'full_body',
    basis: 'Pensado para quien en el chequeo de movimiento tiene patrones limitados sin dolor. Junta tres ideas: las rotaciones articulares lentas y las contracciones al final del rango de Functional Range Conditioning (FRC, Andreo Spina); la respiración y la estabilización del tronco de la Escuela de Praga (DNS, Pavel Kolář), con posiciones como el dead bug y la plancha lateral; y la fuerza en todo el recorrido, que según un metaanálisis de 11 ensayos mejora la movilidad tanto como estirar (Afonso, 2021). Hay que ser honestos: FRC y DNS se basan sobre todo en la práctica clínica y en la opinión de expertos, y faltan ensayos controlados que muestren que funcionan mejor que el entrenamiento de fuerza bien hecho. Por eso este modelo complementa la fuerza; no la reemplaza.',
    refs: [R.strVsStretch2021, R.dns2013, R.dnsReview2024, R.aceCars],
    sessions: [
      { name: 'Cadera y columna', ex: [e('1604', 2, 5, 5), e('0984', 2, 8, 12), tm('2567', 2, 45), e('0276', 3, 6, 10), e('1760', 3, 8, 12)] },
      { name: 'Hombro, tobillo y tronco', ex: [e('1358', 2, 6, 10), e('2143', 2, 8, 12), e('0864', 2, 10, 15), e('1368', 2, 10, 15), tm('0705', 3, 30), e('1757', 2, 8, 10)] }
    ]
  }
]

/** Joint warm-up (inspired by FRC's controlled articular rotations): about five minutes of slow
 *  circles of every major joint, laid at the start of any session from the models screen. */
export const JOINT_WARMUP = [
  e('1403', 1, 3, 3, { rest: 0 }), e('2143', 1, 5, 5, { rest: 0 }), e('1358', 1, 5, 5, { rest: 0 }),
  e('1604', 1, 5, 5, { rest: 0 }), e('1368', 1, 8, 8, { rest: 0 }), e('1428', 1, 8, 8, { rest: 0 })
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
  // a movement check with limited (painless) patterns points at mobility work
  if (p.forMobility && Object.values(profile.screens?.[0]?.r || {}).includes('limited')) s += 3
  if (profile.days && Math.abs(profile.days - p.days) <= 1) s += 1
  return s
}

/** An exercise with the rest its method calls for, unless the model or the trainer set one. */
export const withRest = (x, program) => {
  const rest = x.rest ?? METHODS[program.method]?.rest
  return rest ? { ...x, rest } : { ...x }
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
    out.push({ date: d.toISOString().slice(0, 10), name: s.name, note, ex: s.ex.map(x => withRest(x, program)) })
  }
  return out
}
