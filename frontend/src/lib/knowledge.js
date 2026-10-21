// Trainnery's knowledge area: the core ideas of training theory, written in our own words from
// the reference books listed in SOURCES, each with where Trainnery puts it into practice.
//
// Paraphrased on purpose — the books are cited, never copied — and kept short: a trainer
// should be able to read a concept in a minute and explain it to a client in one. Written in
// Spanish, like the training models (lib/programs.js), because it is coaching content for
// Latin American trainers rather than interface chrome.

/* ---------- the books ---------- */
export const SOURCES = {
  b01: { title: 'Teoría y práctica del entrenamiento deportivo', author: 'Dimas, David y Darío Carrasco Bellido' },
  b02: { title: 'Conceptos y métodos para el entrenamiento físico', author: 'Manuel Vinuesa Lope e Ignacio Vinuesa Jiménez' },
  b03: { title: 'Principios fundamentales del acondicionamiento físico', author: 'J. Arturo Abraldes Valeiras' },
  b04: { title: 'Guía de ejercicio', author: 'Special Olympics' },
  b05: { title: 'Entrenamiento deportivo', author: 'Universidad Nacional de La Plata' },
  b06: { title: 'Principios del entrenamiento deportivo (guía)', author: 'Leslie Quezada' },
  b07: { title: 'Manual de teoría y métodos del entrenamiento de fuerza en escalada deportiva', author: 'César Campoverde Tixi' },
  b08: { title: 'El entrenamiento para el alto rendimiento deportivo', author: 'Webnode.es' },
  b09: { title: 'Principios básicos de entrenamiento (Tema 12)', author: 'Junta de Andalucía' },
  b10: { title: 'Evolución histórica del entrenamiento deportivo', author: 'Universidad Nacional de La Plata' },
  b11: { title: 'La preparación deportiva: antecedentes históricos y conceptos fundamentales de la teoría del entrenamiento', author: 'Emagister' },
  b12: { title: 'Principios del entrenamiento deportivo para personas 60+', author: 'INAPAM, Gobierno de México (2017)' },
  b13: { title: 'Planificación y periodización del entrenamiento deportivo', author: 'David Carrillo Baranda' },
  b15: { title: 'Sports Training: Definitions, Aims, Functions and Characteristics', author: 'Sri Satya Sai University of Technology & Medical Sciences' },
  b16: { title: 'Sports Training: An Introduction', author: 'Instituto de Educación Deportiva de Bangladesh' }
}

export const CATEGORIES = {
  bases: 'Bases del entrenamiento',
  carga: 'La carga y la recuperación',
  principios: 'Principios del entrenamiento',
  capacidades: 'Capacidades y energía',
  planificacion: 'Planificación y periodización',
  practica: 'La sesión en la práctica'
}

/* ---------- the concepts ---------- */
export const CONCEPTS = [
  {
    id: 'que-es-entrenar', cat: 'bases', title: '¿Qué es el entrenamiento deportivo?',
    summary: 'Es un proceso planificado y sistemático que, aplicando cargas de ejercicio y basándose en la ciencia, mejora la capacidad de rendimiento de una persona hacia un objetivo. No es solo «hacer ejercicio»: es ejercicio organizado con intención.',
    points: [
      'Autores clásicos como Matveyev, Harre y Schnabel lo definen como un proceso pedagógico y científico, no como una suma de sesiones sueltas.',
      'Abarca lo físico, lo técnico, lo táctico y lo psicológico.',
      'Su núcleo es la carga: qué se hace, cuánto, con qué intensidad y con cuánto descanso.'
    ],
    practice: 'Por eso Trainnery organiza el trabajo en planes por fechas y no en entrenos aislados: el entrenador decide un objetivo y la app lo sigue sesión a sesión.',
    sources: ['b15', 'b16', 'b09', 'b05']
  },
  {
    id: 'adaptacion', cat: 'bases', title: 'Adaptación y síndrome general de adaptación',
    summary: 'El cuerpo vive en equilibrio (homeostasis). Un estímulo lo rompe y el organismo responde reforzándose para soportarlo mejor la próxima vez. Selye describió esta respuesta al estrés en tres fases: alarma, resistencia y, si el estrés no cesa, agotamiento.',
    points: [
      'Alarma: el rendimiento cae momentáneamente tras el estímulo.',
      'Resistencia: el organismo se ajusta y tolera la carga.',
      'Agotamiento: si la carga es excesiva y sostenida, aparecen fatiga crónica y lesiones.',
      'Hay adaptación inmediata (el pulso sube y baja en una sesión) y adaptación a largo plazo (cambios estables por repetir el estímulo).'
    ],
    practice: 'Las cargas de los modelos están pensadas para quedarse en la fase de resistencia: suben de forma gradual y nunca buscan el agotamiento.',
    sources: ['b01', 'b13']
  },
  {
    id: 'supercompensacion', cat: 'bases', title: 'Supercompensación',
    summary: 'Tras un esfuerzo, la capacidad baja por la fatiga; con el descanso no solo se recupera, sino que sube un poco por encima del nivel inicial. Si el siguiente estímulo llega en ese momento, el rendimiento crece de forma escalonada.',
    points: [
      'Estímulo → fatiga → recuperación → supercompensación → vuelta al nivel base si no hay nuevo estímulo.',
      'Si se entrena demasiado pronto, se acumula fatiga; si se espera demasiado, la mejora se pierde.',
      'Cada capacidad tiene su propio tiempo de supercompensación, y depende de la intensidad de la carga.',
      'Un ejemplo clásico es el aumento de los depósitos de glucógeno tras vaciarlos y reponerlos.'
    ],
    practice: 'Los modelos reparten las sesiones con días de descanso entre ellas (por ejemplo, lunes, miércoles y viernes) y alternan sesiones A y B para dar tiempo a la recuperación de cada grupo muscular.',
    sources: ['b01', 'b06', 'b12', 'b05']
  },
  {
    id: 'carga', cat: 'carga', title: 'Carga externa e interna',
    summary: 'La carga externa es lo que se propone (kilos, repeticiones, kilómetros). La carga interna es cómo responde el cuerpo a eso (frecuencia cardiaca, fatiga, percepción del esfuerzo). La misma carga externa puede ser fácil para uno y muy dura para otro.',
    points: [
      'La carga en sí no existe aislada: depende de quién la recibe y en qué estado está.',
      'La interna se puede medir con parámetros fisiológicos o con la sensación de esfuerzo.',
      'Planificar bien es ajustar la externa mirando la interna.'
    ],
    practice: 'Trainnery registra la carga externa (peso × repeticiones) y, de forma opcional, la carga interna con el esfuerzo por serie (RIR o RPE).',
    sources: ['b09']
  },
  {
    id: 'componentes-carga', cat: 'carga', title: 'Volumen, intensidad, duración, densidad y frecuencia',
    summary: 'Son los componentes con los que se dosifica la carga. Volumen e intensidad son los dos principales, y se relacionan de forma inversa: cuando uno sube mucho, el otro baja.',
    points: [
      'Volumen: cantidad total de trabajo (series × repeticiones, kilos totales, kilómetros, minutos).',
      'Intensidad: magnitud del esfuerzo por unidad de tiempo (peso respecto al máximo, velocidad, pulso).',
      'Duración: tiempo que dura un estímulo sin interrupción.',
      'Densidad: relación entre trabajo y descanso. Con 2:1 se descansa la mitad de lo trabajado; con 1:3, el triple.',
      'Frecuencia: cuántas veces se repite el estímulo en un periodo (sesiones por semana).'
    ],
    practice: 'En cada entreno asignado el entrenador fija series y rango de repeticiones (volumen), y la app sugiere el peso (intensidad). El temporizador de descanso controla la densidad.',
    sources: ['b09', 'b01', 'b05']
  },
  {
    id: 'recuperacion', cat: 'carga', title: 'La recuperación',
    summary: 'El descanso es parte del entrenamiento: es cuando ocurren las adaptaciones. Puede ser completa o incompleta, activa o pasiva, y tiene una fase inmediata y otra aplazada.',
    points: [
      'Completa: pausas largas para recuperar del todo antes del siguiente estímulo (típica de la fuerza máxima).',
      'Incompleta: el siguiente estímulo llega antes de recuperar del todo; se usa para la resistencia.',
      'Activa (trotando, moviéndose suave) o pasiva (quieto).',
      'Inmediata, entre 30 y 60 minutos: se eliminan productos de desecho y se paga la deuda de oxígeno.',
      'Aplazada, de horas a días: se reponen las reservas de energía y se reconstruyen proteínas.'
    ],
    practice: 'Los modelos de fuerza usan pocas repeticiones con descansos largos, y los de pérdida de grasa usan circuitos con poco descanso. El sueño que anota el cliente ayuda a ver si se está recuperando.',
    sources: ['b09', 'b12', 'b02']
  },
  {
    id: 'sobrecarga', cat: 'principios', title: 'Sobrecarga y umbral',
    summary: 'Para mejorar, el estímulo debe superar un umbral propio de cada persona. Por debajo no hay adaptación; demasiado por encima aparece el daño. Sobrecarga no significa exceso: es la dosis justa que obliga a adaptarse.',
    points: [
      'Los estímulos débiles no producen adaptación (salvo que se acumulen durante mucho tiempo).',
      'Los estímulos óptimos superan el umbral y provocan mejoras.',
      'Los estímulos excesivos causan daño funcional o lesiones.',
      'Este umbral cambia con el tiempo: lo que hoy es máximo, mañana será submáximo.'
    ],
    practice: 'La progresión doble de la app solo sube el peso cuando el cliente completa el tope del rango en todas las series: así la carga siempre está en su umbral.',
    sources: ['b12', 'b06', 'b13', 'b03']
  },
  {
    id: 'progresion', cat: 'principios', title: 'Progresión',
    summary: 'La carga debe aumentar de forma gradual (volumen, intensidad o complejidad) a medida que el cuerpo se adapta. Después de una carga grande conviene bajar el nivel para permitir la recuperación.',
    points: [
      'A mayor carga, mayor alteración del organismo y más tiempo para recuperarse.',
      'La progresión debe ser individual: el ritmo de una persona no sirve para otra.',
      'Se puede progresar en peso, en repeticiones, en días de entrenamiento o en dificultad del ejercicio.'
    ],
    practice: 'Cada modelo trabaja en un rango de repeticiones (por ejemplo, de 8 a 12). Primero se suben las repeticiones y, al llegar al tope, el peso; si se estanca varias veces, la app propone una descarga.',
    sources: ['b12', 'b06', 'b01']
  },
  {
    id: 'continuidad', cat: 'principios', title: 'Continuidad',
    summary: 'Un estímulo aislado no sirve: el efecto del anterior se pierde antes de que llegue el siguiente. El entrenamiento necesita regularidad, respetando los descansos.',
    points: [
      'Entrenar una vez por semana rara vez es suficiente para progresar.',
      'Si se dejan pasar demasiados días, la supercompensación se pierde.',
      'Sin continuidad no se crean hábitos.'
    ],
    practice: 'La ficha muestra la constancia de las últimas cuatro semanas y marca en rojo a quien lleva 3 días o más sin anotar, para que el entrenador actúe a tiempo.',
    sources: ['b06', 'b12', 'b01']
  },
  {
    id: 'especificidad', cat: 'principios', title: 'Especificidad',
    summary: 'Se mejora en lo que se entrena. Las cargas deben parecerse al objetivo: fuerza máxima con cargas altas, resistencia con trabajo prolongado, hipertrofia con volumen suficiente.',
    points: [
      'Entrenar para una maratón con distancias muy cortas no prepara para la maratón.',
      'Para ganar músculo no basta con pesos muy ligeros ni solo con fuerza máxima.',
      'La especialización llega sobre una base general amplia.'
    ],
    practice: 'Por eso los modelos se eligen según el objetivo del cliente: «Fuerza con básicos» usa de 3 a 6 repeticiones, «Torso / pierna» de 6 a 12, y el circuito para perder grasa usa más repeticiones con poco descanso.',
    sources: ['b06', 'b07', 'b01', 'b12']
  },
  {
    id: 'individualidad', cat: 'principios', title: 'Individualidad',
    summary: 'Cada persona responde distinto al mismo entrenamiento por herencia, alimentación, sueño, nivel de partida, motivación y entorno. Copiar la rutina de otro no garantiza el mismo resultado.',
    points: [
      'Quien parte de un nivel bajo mejora más rápido al principio.',
      'El descanso y el sueño cambian la respuesta al entrenamiento.',
      'La edad, el sexo y el estado de salud condicionan la elección de ejercicios e intensidades.'
    ],
    practice: 'El perfil de entrenamiento del cliente (objetivo, limitaciones, días disponibles) ordena los modelos y oculta los que chocan con sus limitaciones; el peso sugerido sale de su propio historial.',
    sources: ['b12', 'b06', 'b07', 'b01']
  },
  {
    id: 'multilateralidad', cat: 'principios', title: 'Multilateralidad, variedad y unidad funcional',
    summary: 'El cuerpo funciona como un todo, y un desarrollo amplio de todas las capacidades protege de lesiones y facilita progresar después. Variar ejercicios y métodos evita la monotonía y el estancamiento.',
    points: [
      'Unidad funcional: una carga afecta a todo el organismo, no solo al músculo que trabaja.',
      'Multilateralidad: primero una base amplia (fuerza, resistencia, velocidad, flexibilidad) y luego especializarse.',
      'Variedad: cambiar estímulos ayuda a seguir progresando y a mantener la motivación.'
    ],
    practice: 'Los modelos combinan patrones de sentadilla, bisagra, empuje y tracción, y alternan sesiones A y B con ejercicios distintos.',
    sources: ['b06', 'b12', 'b01']
  },
  {
    id: 'retornos', cat: 'principios', title: 'Retornos decrecientes',
    summary: 'Al empezar se progresa rápido; con los meses, cada mejora cuesta más y llega más despacio. Es normal y no significa que el plan haya dejado de funcionar.',
    points: [
      'Las primeras semanas suelen traer mejoras grandes, muchas de ellas por aprendizaje técnico.',
      'Más adelante hacen falta más volumen, más variación o periodizar para seguir mejorando.',
      'Conviene explicarlo al cliente para mantener su motivación.'
    ],
    practice: 'Cuando la ficha marca «Peso estancado», puede ser el momento de cambiar de modelo o ajustar el volumen.',
    sources: ['b12']
  },
  {
    id: 'pedagogicos', cat: 'principios', title: 'Principios pedagógicos',
    summary: 'Además de los biológicos, hay principios sobre cómo enseñar: que el deportista entienda qué hace y por qué, que la tarea esté a su alcance, y que lo aprendido facilite lo siguiente.',
    points: [
      'Participación activa y consciente: el cliente conoce sus objetivos y su progreso.',
      'Asequibilidad: las tareas se ajustan a la edad, la experiencia y las capacidades.',
      'Transferencia: lo aprendido puede facilitar (positiva) o dificultar (negativa) otra tarea.',
      'Actividad planificada y sistemática: nada se improvisa.'
    ],
    practice: 'Cada ejercicio de los modelos incluye una nota de por qué está ahí, y el entrenador puede dejar una nota en cada entreno: el cliente sabe qué hace y para qué.',
    sources: ['b12', 'b03', 'b16']
  },
  {
    id: 'fatiga', cat: 'carga', title: 'Fatiga y sobreentrenamiento',
    summary: 'La fatiga es un aviso de defensa: reduce temporalmente la capacidad para evitar daños. La normal se pasa con horas de descanso; la que no guarda relación con el esfuerzo es una alarma, y el sobreentrenamiento es un estado que requiere descanso amplio y apoyo médico.',
    points: [
      'Lo aconsejable es trabajar con esfuerzos medios y altos, usar los extremos solo de vez en cuando y nunca llegar al límite.',
      'Señales de sobrecarga: cansancio desproporcionado, recuperación lenta, rendimiento menor, irritabilidad.',
      'Señales de sobreentrenamiento: insomnio, pérdida de apetito y peso, pulso alterado, caída clara del rendimiento.'
    ],
    practice: 'Si un cliente anota poco sueño, su peso se estanca y no completa los entrenos, el entrenador puede bajar el volumen o enviar una semana más suave desde la ficha.',
    sources: ['b02', 'b01']
  },
  {
    id: 'fuerza', cat: 'capacidades', title: 'Manifestaciones de la fuerza',
    summary: 'La fuerza no es una sola capacidad. Se distinguen la fuerza máxima, la fuerza resistencia y la fuerza velocidad (potencia), y cada una se entrena de forma distinta.',
    points: [
      'Fuerza máxima: el mayor esfuerzo posible contra una resistencia. Depende de la hipertrofia y de la coordinación dentro del músculo.',
      'Fuerza resistencia: mantener un esfuerzo muscular durante mucho tiempo.',
      'Fuerza velocidad o potencia: producir mucha fuerza en el menor tiempo.',
      'La fuerza relativa (respecto al peso corporal) importa en deportes donde se mueve el propio cuerpo.'
    ],
    practice: 'El objetivo del perfil define qué manifestación prioriza el modelo: «Fuerza» (fuerza máxima), «Masa muscular» (hipertrofia) o «Resistencia».',
    sources: ['b07', 'b01']
  },
  {
    id: 'energia', cat: 'capacidades', title: 'Sistemas de energía y tipos de fibra',
    summary: 'El músculo obtiene energía de tres vías según la duración y la intensidad del esfuerzo, y tiene fibras lentas (resistentes) y rápidas (potentes).',
    points: [
      'Fosfágenos (ATP-PC): esfuerzos muy intensos de pocos segundos (hasta unos 10 a 15).',
      'Glucolítico (láctico): esfuerzos intensos de hasta unos 2 o 3 minutos; su acumulación produce fatiga.',
      'Aeróbico: esfuerzos largos y moderados, con oxígeno.',
      'Fibras tipo I (lentas): resistentes a la fatiga. Tipo II (rápidas): más fuerza y velocidad, pero se fatigan antes.'
    ],
    practice: 'Explica por qué los descansos cambian según el modelo: series pesadas y cortas necesitan más pausa para reponer los fosfágenos que un circuito ligero.',
    sources: ['b07']
  },
  {
    id: 'metodos', cat: 'capacidades', title: 'Métodos de entrenamiento',
    summary: 'Los métodos se clasifican por cómo combinan ejercicio y descanso: continuos (sin pausas), interválicos (pausas fijas e incompletas) y de repeticiones (pausas que permiten recuperar casi del todo).',
    points: [
      'Continuo uniforme: mismo ritmo todo el tiempo.',
      'Continuo variable o fartlek («juego de velocidad»): cambios de ritmo sin parar.',
      'Interválico: series cortas, medias o largas con descansos fijos.',
      'Repeticiones: esfuerzos intensos con recuperación casi completa.'
    ],
    practice: 'Los modelos de fuerza usan el método de repeticiones; el circuito para perder grasa se acerca al interválico. Para lo aeróbico, el entrenador puede publicar guías en Contenido.',
    sources: ['b09', 'b01']
  },
  {
    id: 'periodizacion', cat: 'planificacion', title: 'Periodización',
    summary: 'Es dividir el entrenamiento en periodos con objetivos distintos para llegar en la mejor forma al momento clave. Matveyev la popularizó con tres periodos: preparatorio, competitivo y de transición.',
    points: [
      'Preparatorio: se construye la forma. Al principio predomina el volumen y luego sube la intensidad.',
      'Competitivo: se mantiene la forma.',
      'Transición: se pierde la forma de manera controlada para recuperarse.',
      'Las cargas son ondulantes: alternan trabajo y recuperación en días, semanas y meses.',
      'Enfoques contemporáneos, como el entrenamiento por bloques de Verkhoshansky, concentran capacidades por etapas y aprovechan su efecto residual.'
    ],
    practice: 'Asignar un modelo durante 4 semanas equivale a un mesociclo; al terminarlo, el entrenador puede cambiar de modelo o de énfasis.',
    sources: ['b13', 'b12', 'b05', 'b11', 'b01']
  },
  {
    id: 'ciclos', cat: 'planificacion', title: 'Macrociclo, mesociclo y microciclo',
    summary: 'Son las unidades de la planificación, de mayor a menor. El macrociclo es la temporada (más de seis meses), el mesociclo un bloque de semanas con un objetivo y el microciclo una semana de entrenamiento.',
    points: [
      'Microciclo: normalmente una semana; puede ser de carga, de ajuste o de recuperación.',
      'Mesociclo: entre 3 y 6 microciclos con un mismo objetivo.',
      'Macrociclo: la suma de mesociclos hasta el objetivo principal.',
      'La sesión es la unidad básica que forma cada microciclo.'
    ],
    practice: 'En Trainnery, cada semana de un modelo es un microciclo y aplicarlo 3 o 4 semanas forma un mesociclo. El calendario de la ficha muestra el mes completo.',
    sources: ['b13', 'b07', 'b02', 'b01']
  },
  {
    id: 'historia', cat: 'planificacion', title: 'Breve historia de la planificación',
    summary: 'La idea de organizar el entrenamiento es antigua: los griegos ya alternaban días suaves, duros, de descanso y medios. En el siglo XX se formalizó con autores como Kotov, Pihkala, Ozolin y Matveyev.',
    points: [
      'Antigua Grecia: las «tétradas», ciclos de cuatro días con distinta carga, y preparación de unos 10 meses.',
      'Kotov (1916): primeras ideas de entrenamiento continuo dividido en ciclos.',
      'Pihkala: carga ondulante y aumento de la intensidad a costa del volumen con el tiempo.',
      'Matveyev: periodización anual en tres periodos, base de la planificación moderna.'
    ],
    practice: 'Que el entrenamiento por ciclos funcione no es una moda: es una idea con más de un siglo de práctica y estudio.',
    sources: ['b10', 'b13', 'b11']
  },
  {
    id: 'sesion', cat: 'practica', title: 'Estructura de la sesión',
    summary: 'Toda sesión tiene tres partes: calentamiento, parte principal y vuelta a la calma. Se adapta a los objetivos, al nivel, a la edad y al tiempo disponible.',
    points: [
      'Parte preparatoria o calentamiento: prepara el cuerpo y la mente.',
      'Parte principal: donde se cumplen los objetivos del día.',
      'Vuelta a la calma: reajuste progresivo del pulso y relajación.'
    ],
    practice: 'Los entrenos asignados contienen la parte principal; el entrenador puede indicar el calentamiento en la nota del día o publicar una guía de calentamiento en Contenido.',
    sources: ['b02', 'b04']
  },
  {
    id: 'calentamiento', cat: 'practica', title: 'Calentamiento y vuelta a la calma',
    summary: 'Calentar activa de forma progresiva músculos, articulaciones y sistemas para rendir mejor y prevenir lesiones. Conviene que sea general y luego específico, dinámico, ordenado y proporcional al esfuerzo que viene.',
    points: [
      'Parte general: actividad aeróbica suave de unos 5 a 15 minutos para subir la temperatura.',
      'Parte específica: movimientos y series de aproximación de lo que se va a entrenar.',
      'A más edad y más masa muscular, el calentamiento debe ser más largo y progresivo.',
      'Al terminar: unos minutos de actividad suave y estiramientos estáticos.'
    ],
    practice: 'Para los clientes que empiezan, una buena nota de entreno es: «5 minutos de bici, movilidad de cadera y hombro, y dos series ligeras del primer ejercicio».',
    sources: ['b02', 'b04', 'b01']
  },
  {
    id: 'mayores', cat: 'practica', title: 'Entrenar a personas mayores',
    summary: 'Los principios del entrenamiento se aplican igual en personas mayores de 60 años, pero con más énfasis en la individualización, la asequibilidad y la recuperación. El objetivo principal es mantener la autonomía y la capacidad funcional.',
    points: [
      'Elegir ejercicios estables y cargas moderadas, con una progresión prudente.',
      'Dar más tiempo al calentamiento y a la recuperación entre sesiones.',
      'Incluir fuerza de piernas, equilibrio y movilidad para la marcha y la prevención de caídas.',
      'Consultar con el médico antes de empezar, sobre todo si hay enfermedades.'
    ],
    practice: 'El modelo «Salud y autonomía (60+)» sigue estas pautas: 2 o 3 días por semana, ejercicios guiados y trabajo de piernas.',
    sources: ['b12', 'b04']
  }
]

export const conceptById = Object.fromEntries(CONCEPTS.map(c => [c.id, c]))
