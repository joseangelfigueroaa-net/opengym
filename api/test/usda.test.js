import test from 'node:test';
import assert from 'node:assert/strict';
import { pickNutrients, lookupFood, cachedFood } from '../trainer/usda.js';
import { estimateMeal, prefetchMeal, unknownFoods } from '../trainer/nutrition.js';

const quinoa = {
  foods: [{ description: 'Quinoa, cooked', dataType: 'SR Legacy', foodNutrients: [
    { nutrientId: 1008, value: 120 }, { nutrientId: 1003, value: 4.4 }, { nutrientId: 1005, value: 21.3 }, { nutrientId: 1004, value: 1.9 }] }]
};
const realFetch = globalThis.fetch;
const fakeFetch = (body, { ok = true, throws = false } = {}) => {
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    if (throws) throw new Error('network down');
    return { ok, json: async () => body };
  };
  return calls;
};

test('USDA nutrient ids are read into per 100 g values; foods missing a macro are skipped', () => {
  assert.deepEqual(pickNutrients(quinoa.foods), [120, 4.4, 21.3, 1.9]);
  assert.equal(pickNutrients([{ foodNutrients: [{ nutrientId: 1008, value: 120 }] }]), null, 'incomplete food skipped');
  assert.equal(pickNutrients(undefined), null);
});

test('without USDA_API_KEY nothing is sent anywhere, and the local table is all there is', async () => {
  delete process.env.USDA_API_KEY;
  const calls = fakeFetch(quinoa);
  assert.equal(await lookupFood('quinoa-sin-clave'), null);
  assert.equal(calls.length, 0, 'no request made');
  globalThis.fetch = realFetch;
  assert.equal(estimateMeal('arroz 200 g').kcal, 260, 'the local table still works');
});

test('with the key, an unknown food is looked up once, cached, and used in the estimate', async () => {
  process.env.USDA_API_KEY = 'clave-de-prueba';
  const calls = fakeFetch(quinoa);
  await prefetchMeal('2 quinoa');
  await prefetchMeal('2 quinoa');
  assert.equal(calls.length, 1, 'second time comes from the cache');
  assert.match(calls[0], /api_key=clave-de-prueba/, 'the key goes to USDA');
  assert.match(calls[0], /query=quinoa/);
  assert.deepEqual(cachedFood('quinoa'), [120, 4.4, 21.3, 1.9]);
  const e = estimateMeal('2 quinoa');
  assert.equal(e.items[0].grams, 200, 'two 100 g portions');
  assert.equal(e.kcal, 240);
  assert.deepEqual(e.unmatched, []);
  globalThis.fetch = realFetch;
});

test('when USDA does not answer, the meal is not broken: the food is just unrecognised', async () => {
  process.env.USDA_API_KEY = 'clave-de-prueba';
  fakeFetch(quinoa, { throws: true });
  await prefetchMeal('amaranto');
  assert.equal(cachedFood('amaranto'), null);
  assert.equal(estimateMeal('amaranto'), null);
  fakeFetch(quinoa, { ok: false });
  await prefetchMeal('chia');
  assert.equal(cachedFood('chia'), null, 'an error answer is not treated as food data');
  globalThis.fetch = realFetch;
  delete process.env.USDA_API_KEY;
});

test('foods the local table knows are never sent to USDA', () => {
  assert.deepEqual(unknownFoods('2 arepas con pollo y aguacate'), []);
  assert.deepEqual(unknownFoods('quinoa con aguacate'), ['quinoa']);
});
