/* Looks foods up in USDA FoodData Central (Trainnery), for meal words the local table does not know.
 *
 * Needs USDA_API_KEY in the server's environment. Without it, or when USDA does not answer, the
 * local table is all there is and nothing breaks. The key is only sent to USDA, never logged,
 * and never reaches the app. Every food name is cached for 30 days, and calls are capped per hour:
 * all users of this instance share one IP address at USDA, which allows 1,000 requests an hour.
 */
const BASE = 'https://api.nal.usda.gov/fdc/v1/foods/search';
const TTL = 30 * 86400000;
const HOUR_CAP = 900;
const CACHE_MAX = 5000;
// FoodData Central nutrient ids: energy (kcal), protein, carbohydrate by difference, total fat
const NUTRIENTS = { kcal: 1008, protein: 1003, carbs: 1005, fat: 1004 };

const cache = new Map();   // food name -> { at, per100 | null }
let calls = [];            // when each request went out, for the hourly cap

const key = () => process.env.USDA_API_KEY || '';
export const usdaEnabled = () => !!key();

/** The per-100 g values [kcal, protein, carbs, fat] from a FoodData Central search response, or null. */
export function pickNutrients(foods) {
  for (const f of foods || []) {
    const got = {};
    for (const n of f.foodNutrients || []) {
      for (const [name, id] of Object.entries(NUTRIENTS)) if (n.nutrientId === id && Number.isFinite(n.value)) got[name] = n.value;
    }
    if (Object.keys(NUTRIENTS).every(k => got[k] != null)) {
      return [got.kcal, got.protein, got.carbs, got.fat].map(x => Math.round(x * 10) / 10);
    }
  }
  return null;
}

/** What is already known about a food name, without calling USDA. null when unknown. */
export function cachedFood(name, now = Date.now()) {
  const hit = cache.get(name);
  return hit && now - hit.at < TTL ? hit.per100 : null;
}

/** Looks a food up at USDA, once, and remembers the answer (including "not found"). Never throws. */
export async function lookupFood(name, now = Date.now()) {
  if (!usdaEnabled() || !name) return null;
  const known = cache.get(name);
  if (known && now - known.at < TTL) return known.per100;
  calls = calls.filter(t => now - t < 3600000);
  if (calls.length >= HOUR_CAP) return null;   // over the hourly cap: unknown for now, not remembered
  calls.push(now);
  let per100 = null;
  try {
    const url = BASE + '?' + new URLSearchParams({ query: name, pageSize: '5', dataType: 'Foundation,SR Legacy', api_key: key() });
    const r = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (r.ok) per100 = pickNutrients((await r.json()).foods);
  } catch { /* unreachable or slow: the local table decides */ }
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(name, { at: now, per100 });
  return per100;
}
