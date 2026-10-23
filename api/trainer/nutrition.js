/* Estimates a meal's calories and macros from what the client wrote (Trainnery).
 *
 * A table of common foods, per 100 g, with a typical serving in grams and a few household units.
 * The text is split into items ("2 arepas con pollo y aguacate"); each item gets one food and an
 * amount, and the amounts are added up. These are estimates from common food tables: the saved
 * meal says so (est: true), and the trainer can see and correct it.
 *
 * per100 = [kcal, protein g, carbs g, fat g]
 */
const FOODS = [
  { names: ['arroz'], per100: [130, 2.7, 28, 0.3], serve: 150, units: { taza: 158, cucharada: 45 } },
  { names: ['arepa', 'arepas'], per100: [225, 4.5, 48, 1.5], serve: 80 },
  { names: ['caraotas', 'caraota', 'frijoles negros', 'frijoles', 'frijol'], per100: [132, 8.9, 23.6, 0.5], serve: 150, units: { taza: 172, cucharada: 30 } },
  { names: ['lentejas', 'lenteja'], per100: [116, 9, 20, 0.4], serve: 150, units: { taza: 198 } },
  { names: ['garbanzos', 'garbanzo'], per100: [164, 8.9, 27, 2.6], serve: 150, units: { taza: 164 } },
  { names: ['pollo', 'pechuga', 'pechuga de pollo', 'muslo de pollo', 'desmechado'], per100: [165, 31, 0, 3.6], serve: 120, units: { presa: 150 } },
  { names: ['carne', 'carne de res', 'carne molida', 'res', 'bistec', 'carne asada', 'pabellon'], per100: [250, 26, 0, 15], serve: 120 },
  { names: ['cerdo', 'chuleta', 'lomo de cerdo'], per100: [242, 27, 0, 14], serve: 120 },
  { names: ['pescado', 'pargo', 'merluza', 'tilapia'], per100: [120, 22, 0, 3], serve: 120 },
  { names: ['salmon'], per100: [208, 20, 0, 13], serve: 120 },
  { names: ['atun'], per100: [116, 26, 0, 1], serve: 100 },
  { names: ['huevo', 'huevos'], per100: [143, 12.6, 0.7, 9.5], serve: 50, units: { unidad: 50 } },
  { names: ['queso', 'queso blanco', 'queso de mano'], per100: [280, 18, 3, 22], serve: 30 },
  { names: ['jamon'], per100: [145, 21, 1.5, 6], serve: 30 },
  { names: ['aguacate', 'palta'], per100: [160, 2, 8.5, 14.7], serve: 100 },
  { names: ['platano maduro', 'tajada', 'tajadas', 'maduro'], per100: [190, 1.5, 40, 7], serve: 100 },
  { names: ['platano', 'platanos'], per100: [122, 1.3, 32, 0.4], serve: 100 },
  { names: ['cambur', 'banano', 'banana'], per100: [89, 1.1, 23, 0.3], serve: 120, units: { unidad: 120 } },
  { names: ['manzana'], per100: [52, 0.3, 14, 0.2], serve: 180 },
  { names: ['naranja'], per100: [47, 0.9, 12, 0.1], serve: 130 },
  { names: ['papa', 'papas'], per100: [87, 1.9, 20, 0.1], serve: 150 },
  { names: ['yuca'], per100: [160, 1.4, 38, 0.3], serve: 150 },
  { names: ['pan integral'], per100: [247, 13, 41, 3.4], serve: 30, units: { rebanada: 30, unidad: 30 } },
  { names: ['pan', 'pan blanco', 'pan sanduche', 'sanduche'], per100: [265, 9, 49, 3.2], serve: 30, units: { rebanada: 30, unidad: 30 } },
  { names: ['tortilla', 'tortillas'], per100: [218, 5.7, 44, 2.9], serve: 30, units: { unidad: 30 } },
  { names: ['avena'], per100: [71, 2.5, 12, 1.5], serve: 150, units: { taza: 234 } },
  { names: ['pasta', 'espagueti', 'spaghetti', 'macarrones'], per100: [158, 5.8, 31, 0.9], serve: 150, units: { taza: 140 } },
  { names: ['leche'], per100: [61, 3.2, 4.8, 3.3], serve: 200, units: { vaso: 200, taza: 240 } },
  { names: ['yogur', 'yogurt'], per100: [61, 3.5, 4.7, 3.3], serve: 150, units: { vaso: 150, taza: 200 } },
  { names: ['mantequilla de mani', 'pasta de mani'], per100: [588, 25, 20, 50], serve: 15, units: { cucharada: 16 } },
  { names: ['mani', 'almendras', 'nueces'], per100: [567, 26, 16, 49], serve: 30 },
  { names: ['aceite'], per100: [884, 0, 0, 100], serve: 10, units: { cucharada: 13, cucharadita: 4 } },
  { names: ['ensalada', 'vegetales', 'verduras'], per100: [25, 1.3, 5, 0.2], serve: 100 },
  { names: ['tomate'], per100: [18, 0.9, 3.9, 0.2], serve: 100 },
  { names: ['brocoli'], per100: [35, 2.4, 7.2, 0.4], serve: 100 },
  { names: ['zanahoria'], per100: [41, 0.9, 10, 0.2], serve: 80 },
  { names: ['pizza'], per100: [266, 11, 33, 10], serve: 107, units: { pedazo: 107, porcion: 107 } },
  { names: ['hamburguesa'], per100: [250, 13, 24, 11], serve: 150 },
  { names: ['empanada', 'empanadas'], per100: [260, 8, 30, 12], serve: 100, units: { unidad: 100 } },
  { names: ['galleta', 'galletas'], per100: [480, 6, 68, 20], serve: 30, units: { unidad: 10 } }
];

// Longest names first, so "platano maduro" wins over "platano" and "mantequilla de mani" over "mani"
const INDEX = FOODS.flatMap(f => f.names.map(name => ({ name, food: f })))
  .sort((a, b) => b.name.length - a.name.length);

const NUMBER = '(\\d+(?:[.,]\\d+)?|un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|medio|media)';
const UNIT = '(gr|grs|gramos?|g|kg|kilos?|ml|litros?|l|tazas?|cucharadas?|cucharaditas?|rebanadas?|unidades?|unid|und|porciones?|vasos?|lonchas?|tajadas?|platos?|pedazos?|presas?)';
const BEFORE = new RegExp(NUMBER + '\\s*' + UNIT + '?\\s*(?:de\\s+)?$');
const AFTER = new RegExp('^\\s*' + NUMBER + '\\s*' + UNIT + '?');
const WORDS = { un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, medio: 0.5, media: 0.5 };
const SPLIT = /,|;|\+|\.|\n| y | con | mas | luego | e /;

const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
const num = s => WORDS[s] ?? parseFloat(String(s).replace(',', '.'));

// "gramos" -> g, "tazas" -> taza, "porciones" -> porcion; the household units a food may define
function unitKey(u) {
  const x = u.replace(/es$/, '').replace(/s$/, '');
  if (['g', 'gr', 'grs', 'gramo'].includes(x)) return 'g';
  if (['kg', 'kilo'].includes(x)) return 'kg';
  if (['litro', 'l'].includes(x)) return 'l';
  if (['unid', 'und', 'unidad'].includes(x)) return 'unidad';
  return x;
}

function grams(food, n, unit) {
  if (!unit) return n * food.serve;
  const k = unitKey(unit);
  if (k === 'g' || k === 'ml') return n;
  if (k === 'kg') return n * 1000;
  if (k === 'l') return n * 1000;
  if (food.units && food.units[k]) return n * food.units[k];
  return n * food.serve;
}

/** Finds the food named in one piece of text, with what came before and after the name. */
function findFood(seg) {
  for (const { name, food } of INDEX) {
    const re = new RegExp('(^|[^a-z])(' + name.replace(/ /g, ' ') + ')(?![a-z])');
    const m = re.exec(seg);
    if (m) {
      const at = m.index + m[1].length;
      return { food, before: seg.slice(0, at), after: seg.slice(at + name.length) };
    }
  }
  return null;
}

/** Estimates one meal from its description. Returns null when no food in it is recognised. */
export function estimateMeal(text) {
  const items = [], unmatched = [];
  let kcal = 0, protein = 0, carbs = 0, fat = 0;
  for (const seg of norm(text).split(SPLIT).map(s => s.trim()).filter(Boolean).slice(0, 30)) {
    const hit = findFood(seg);
    if (!hit) { unmatched.push(seg); continue; }
    const m = BEFORE.exec(hit.before) || AFTER.exec(hit.after);
    const n = m ? num(m[1]) : 1;
    const g = grams(hit.food, n, m ? m[2] : null);
    const [k, p, c, f] = hit.food.per100;
    kcal += g / 100 * k; protein += g / 100 * p; carbs += g / 100 * c; fat += g / 100 * f;
    items.push({ food: hit.food.names[0], grams: Math.round(g) });
  }
  if (!items.length) return null;
  return {
    kcal: Math.round(kcal), protein: Math.round(protein), carbs: Math.round(carbs), fat: Math.round(fat),
    items, unmatched
  };
}
