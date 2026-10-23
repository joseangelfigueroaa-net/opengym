import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateMeal } from '../trainer/nutrition.js';
import { makeEntry } from '../trainer/records.js';

const author = { id: 'c1', role: 'client' };

test('a meal written in words is estimated: arepas, chicken and avocado', () => {
  const e = estimateMeal('2 arepas con pollo desmechado y aguacate');
  assert.ok(e, 'recognised');
  assert.deepEqual(e.items.map(i => i.food), ['arepa', 'pollo', 'aguacate']);
  assert.ok(e.kcal >= 600 && e.kcal <= 900, 'about 720 kcal, got ' + e.kcal);
  assert.ok(e.protein > 25, 'protein counted: ' + e.protein);
  assert.deepEqual(e.unmatched, []);
});

test('grams are read as grams, and cups and units as the food\'s own measure', () => {
  const grams = estimateMeal('arroz 200 g');
  assert.equal(grams.items[0].grams, 200);
  assert.equal(grams.kcal, 260);
  const cup = estimateMeal('1 taza de arroz');
  assert.equal(cup.items[0].grams, 158);
  assert.equal(cup.kcal, 205);
  const two = estimateMeal('dos huevos');
  assert.equal(two.items[0].grams, 100);
});

test('a description with no food it knows gives no estimate, and nothing is invented', () => {
  assert.equal(estimateMeal('un plato de mi abuela'), null);
  assert.equal(estimateMeal(''), null);
});

test('part of a meal recognised is still estimated, and the rest is listed', () => {
  const e = estimateMeal('arroz, sopa de la casa');
  assert.equal(e.items.length, 1);
  assert.deepEqual(e.unmatched, ['sopa de la casa']);
});

test('saving a meal with no numbers estimates them; typed numbers win', () => {
  const est = makeEntry({ kind: 'meal', d: '2026-10-22', v: { meal: 'lunch', text: 'arroz 200 g' } }, author);
  assert.equal(est.v.kcal, 260);
  assert.equal(est.v.est, true);
  const typed = makeEntry({ kind: 'meal', d: '2026-10-22', v: { meal: 'lunch', text: 'arroz 200 g', kcal: 500 } }, author);
  assert.equal(typed.v.kcal, 500);
  assert.equal(typed.v.est, undefined, 'typed values are not marked as estimated');
});

test('an unknown meal is kept, marked, without numbers', () => {
  const e = makeEntry({ kind: 'meal', d: '2026-10-22', v: { meal: 'dinner', text: 'mi abuela' } }, author);
  assert.equal(e.v.kcal, undefined);
  assert.equal(e.v.est, true);
  assert.equal(e.v.unknown, true);
});
