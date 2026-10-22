/* A trainer's public profile (Trainnery): who they are, as their clients see it.
 *
 *   user.trainerProfile   { name, age, years, story, certifications: [], methods: [], about, updated }
 *
 * Lives on the trainer's user record in db.json — it is small and read on every client's
 * "my trainer" request. Everything is optional; an empty profile shows just the account name.
 */

export const MAX_STORY = 2000;
export const MAX_ABOUT = 3000;
export const MAX_ITEMS = 15;            // certifications, and favourite methods
export const MAX_ITEM = 120;

export class ProfileError extends Error {}

const text = (v, max, what) => {
  const s = String(v ?? '').trim();
  if (s.length > max) throw new ProfileError(`${what} is limited to ${max} characters`);
  return s;
};
const whole = (v, lo, hi, what) => {
  if (v === '' || v == null) return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < lo || n > hi) throw new ProfileError(`${what} must be a whole number from ${lo} to ${hi}`);
  return n;
};
const list = (v, what) => {
  const items = (Array.isArray(v) ? v : []).map(x => text(x, MAX_ITEM, what)).filter(Boolean);
  if (items.length > MAX_ITEMS) throw new ProfileError(`up to ${MAX_ITEMS} ${what}`);
  return [...new Set(items)];
};

/** What a trainer may save; anything else in the body is dropped. */
export function cleanProfile(body, now = Date.now()) {
  return {
    name: text(body.name, 60, 'name'),
    age: whole(body.age, 18, 99, 'age'),
    years: whole(body.years, 0, 60, 'years of experience'),
    story: text(body.story, MAX_STORY, 'story'),
    certifications: list(body.certifications, 'certifications'),
    methods: list(body.methods, 'methods'),
    about: text(body.about, MAX_ABOUT, 'description'),
    updated: new Date(now).toISOString()
  };
}

/** The profile as shown to the trainer and their clients; falls back to the account name. */
export function publicProfile(user) {
  const p = user.trainerProfile || {};
  return {
    name: p.name || user.name,
    age: p.age ?? null, years: p.years ?? null,
    story: p.story || '', certifications: p.certifications || [], methods: p.methods || [],
    about: p.about || '', updated: p.updated || null
  };
}
