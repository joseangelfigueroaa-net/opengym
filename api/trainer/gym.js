/* Gyms (Trainnery): an owner, the trainers on staff, and the members.
 *
 * Pure functions over the db object, like logic.js. Shapes added to db.json:
 *
 *   gyms[]        { id, name, ownerId, plan: 'basic' | 'pro' | 'chain', created, brand? }     one gym per owner
 *                 brand: { accent, theme } — the app's colours for everyone in the gym (owner, staff, members)
 *   gymStaff[]    { gymId, userId, shift, since }      trainers who work there
 *   gymMembers[]  { gymId, userId, shift, since }      people who train there; one gym per person
 *   gymInvites[]  { token, gymId, kind: 'trainer' | 'member', created, usedBy?, usedAt?, signupBy? }
 *
 * A member's trainer is the ordinary trainer↔client link (db.links), so everything a trainer
 * already does for a client works the same for a gym member. The gym owns the assignment: it
 * links a member to one of its trainers, moves them between trainers, and spreads new members
 * over the trainers with the most room in the member's shift.
 *
 * What the owner sees of a member is deliberately thin: name, shift, trainer, and how recently
 * they were active. Weights, meals, photos and messages stay between the member and the trainer.
 */
import crypto from 'node:crypto';
import * as T from './logic.js';

export const GYM_PLANS = {
  basic: { members: 100, trainers: 3 },
  pro: { members: 400, trainers: 10 },
  chain: { members: 5000, trainers: 100 }
};
export const SHIFTS = ['morning', 'afternoon', 'evening'];
// The app's own accent names (frontend/src/lib/format.js ACCENTS) and themes.
export const BRAND_ACCENTS = ['lime', 'sky', 'orange', 'violet', 'pink', 'red', 'teal', 'gold'];
export const BRAND_THEMES = ['dark', 'light'];
// A member code is posted at the front desk and used by many people, so it lives longer than a
// trainer's personal link; a trainer's staff link is single-use like a client invite.
export const MEMBER_CODE_DAYS = 90;
export const STAFF_INVITE_DAYS = 14;
// Staff join on a trainer plan the gym pays for; the role goes away with the job.
export const STAFF_PLAN = 'platinum';

export class GymError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}
export const HTTP_FOR = { not_owner: 403, not_member: 404, not_staff: 404, limit: 409, has_gym: 409, has_trainer: 409, no_room: 409, invalid: 404, expired: 410, used: 409, bad: 400 };

export function ensureShape(db) {
  db.gyms = db.gyms || [];
  db.gymStaff = db.gymStaff || [];
  db.gymMembers = db.gymMembers || [];
  db.gymInvites = db.gymInvites || [];
  return T.ensureShape(db);
}

const isPlan = p => typeof p === 'string' && Object.hasOwn(GYM_PLANS, p);
const cleanShift = s => (SHIFTS.includes(s) ? s : '');
const cleanName = n => String(n || '').replace(/\s+/g, ' ').trim().slice(0, 60);
const ms = iso => Date.parse(iso);
/** A gym's colours, or null for the app's own. Unknown values are dropped, never stored. */
export function cleanBrand(b) {
  if (!b || typeof b !== 'object') return null;
  const accent = BRAND_ACCENTS.includes(b.accent) ? b.accent : null;
  const theme = BRAND_THEMES.includes(b.theme) ? b.theme : null;
  return accent || theme ? { accent, theme } : null;
}

export const gymById = (db, id) => db.gyms.find(g => g.id === id) || null;
export const ownedGym = (db, userId) => db.gyms.find(g => g.ownerId === userId) || null;
export const staffOf = (db, gymId) => db.gymStaff.filter(s => s.gymId === gymId);
export const membersOf = (db, gymId) => db.gymMembers.filter(m => m.gymId === gymId);
export const staffRow = (db, gymId, userId) => db.gymStaff.find(s => s.gymId === gymId && s.userId === userId) || null;
export const memberRow = (db, userId) => db.gymMembers.find(m => m.userId === userId) || null;
export const limitsOf = gym => GYM_PLANS[isPlan(gym?.plan) ? gym.plan : 'basic'];

/** How this account relates to a gym, as /api/me tells the app. Owner wins over staff over member. */
export function roleOf(db, user) {
  if (!user) return null;
  const own = ownedGym(db, user.id);
  if (own) return { id: own.id, name: own.name, role: 'owner', brand: own.brand || null };
  const staff = db.gymStaff.find(s => s.userId === user.id);
  if (staff) { const g = gymById(db, staff.gymId); if (g) return { id: g.id, name: g.name, role: 'trainer', shift: staff.shift, brand: g.brand || null }; }
  const m = memberRow(db, user.id);
  if (m) { const g = gymById(db, m.gymId); if (g) return { id: g.id, name: g.name, role: 'member', shift: m.shift, brand: g.brand || null }; }
  return null;
}

/* ---------------- set up (admin) ---------------- */

/** Makes `owner` the owner of a gym, renames it, changes its plan or colours. plan null closes it.
 *  `brand` undefined keeps the current colours; null goes back to the app's own. */
export function setGym(db, owner, { name, plan, brand }, now = Date.now()) {
  const cur = ownedGym(db, owner.id);
  if (!plan) {
    if (cur) closeGym(db, cur);
    return null;
  }
  if (!isPlan(plan)) throw new GymError('bad', 'unknown gym plan');
  const n = cleanName(name) || cur?.name;
  if (!n) throw new GymError('bad', 'the gym needs a name');
  if (cur) { cur.name = n; cur.plan = plan; if (brand !== undefined) cur.brand = cleanBrand(brand); return cur; }
  const gym = { id: 'g' + crypto.randomBytes(8).toString('hex'), name: n, ownerId: owner.id, plan, created: new Date(now).toISOString(), brand: cleanBrand(brand) };
  db.gyms.push(gym);
  return gym;
}

/** Closing a gym lets everyone go: gym links are undone, staff lose the role the gym gave them. */
function closeGym(db, gym) {
  for (const s of staffOf(db, gym.id)) removeStaff(db, gym, s.userId);
  db.gymMembers = db.gymMembers.filter(m => m.gymId !== gym.id);
  db.gymInvites = db.gymInvites.filter(i => i.gymId !== gym.id);
  db.gyms = db.gyms.filter(g => g !== gym);
}

/* ---------------- invites ---------------- */

const daysFor = kind => (kind === 'member' ? MEMBER_CODE_DAYS : STAFF_INVITE_DAYS);
const isExpired = (inv, now) => now - ms(inv.created) > daysFor(inv.kind) * 86400000;
export const openInvites = (db, gymId, now = Date.now()) =>
  db.gymInvites.filter(i => i.gymId === gymId && !i.usedBy && !isExpired(i, now));

export function createInvite(db, gym, kind, now = Date.now()) {
  if (kind !== 'trainer' && kind !== 'member') throw new GymError('bad', 'unknown invite kind');
  const lim = limitsOf(gym);
  if (kind === 'trainer' && staffOf(db, gym.id).length + openInvites(db, gym.id, now).filter(i => i.kind === 'trainer').length >= lim.trainers)
    throw new GymError('limit', 'your gym plan has no room for another trainer');
  if (kind === 'member' && membersOf(db, gym.id).length >= lim.members)
    throw new GymError('limit', 'your gym plan has no room for more members');
  // one live member code at a time: a new one replaces the one on the wall
  if (kind === 'member') db.gymInvites = db.gymInvites.filter(i => !(i.gymId === gym.id && i.kind === 'member'));
  let token;
  do { token = crypto.randomBytes(16).toString('hex'); } while (db.gymInvites.some(i => i.token === token) || db.trainerInvites.some(i => i.token === token));
  const inv = { token, gymId: gym.id, kind, created: new Date(now).toISOString() };
  db.gymInvites.push(inv);
  return inv;
}

export function revokeInvite(db, gym, token) {
  const before = db.gymInvites.length;
  db.gymInvites = db.gymInvites.filter(i => !(i.gymId === gym.id && i.token === token && !i.usedBy));
  if (before === db.gymInvites.length) throw new GymError('invalid', 'no such open invite');
}

/** An invite someone may still use. A staff link that already created a profile belongs to it. */
export function usableInvite(db, token, now = Date.now(), who = null) {
  const inv = db.gymInvites.find(i => i.token === String(token || '').toLowerCase());
  if (!inv) throw new GymError('invalid', 'this gym link does not exist');
  if (inv.usedBy || (inv.signupBy && inv.signupBy !== who?.id)) throw new GymError('used', 'this gym link was already used');
  if (isExpired(inv, now)) throw new GymError('expired', 'this gym link has expired — ask the gym for a new one');
  const gym = gymById(db, inv.gymId);
  if (!gym) throw new GymError('invalid', 'this gym link is no longer valid');
  return { inv, gym };
}

/** Joins the gym the link belongs to, as staff or as a member. */
export function join(db, user, token, { shift } = {}, now = Date.now()) {
  const { inv, gym } = usableInvite(db, token, now, user);
  if (gym.ownerId === user.id) throw new GymError('bad', 'you own this gym');
  const at = new Date(now).toISOString();
  if (inv.kind === 'trainer') {
    if (db.gymStaff.some(s => s.userId === user.id)) throw new GymError('has_gym', 'you already work at a gym on Trainnery');
    if (memberRow(db, user.id)) throw new GymError('has_gym', 'leave your gym as a member before joining one as staff');
    if (T.linkOf(db, user.id)) throw new GymError('has_trainer', 'leave your own trainer before joining a gym as staff');
    if (staffOf(db, gym.id).length >= limitsOf(gym).trainers) throw new GymError('limit', 'this gym has no room for another trainer');
    db.gymStaff.push({ gymId: gym.id, userId: user.id, shift: cleanShift(shift), since: at });
    if (!T.isTrainer(user)) user.trainer = { plan: STAFF_PLAN, since: at, viaGym: gym.id };
    inv.usedBy = user.id; inv.usedAt = at;
  } else {
    const cur = memberRow(db, user.id);
    if (cur) throw new GymError('has_gym', cur.gymId === gym.id ? 'you are already a member of this gym' : 'you are already a member of another gym — leave it first');
    if (db.gymStaff.some(s => s.userId === user.id)) throw new GymError('has_gym', 'staff cannot also be members');
    if (membersOf(db, gym.id).length >= limitsOf(gym).members) throw new GymError('limit', 'this gym has no room for more members');
    db.gymMembers.push({ gymId: gym.id, userId: user.id, shift: cleanShift(shift), since: at });
  }
  return { gym, kind: inv.kind };
}

/** The owner works the floor too: they join their own gym's staff without a link. A trainer
 *  keeps their own plan; an owner who isn't one gets the gym's staff plan, like any staff. */
export function addOwnerAsStaff(db, gym, owner, { shift } = {}, now = Date.now()) {
  if (gym.ownerId !== owner.id) throw new GymError('not_owner', 'only the owner can do this');
  if (staffRow(db, gym.id, owner.id)) throw new GymError('has_gym', 'you are already a trainer here');
  if (db.gymStaff.some(s => s.userId === owner.id)) throw new GymError('has_gym', 'you already work at another gym on Trainnery');
  if (memberRow(db, owner.id)) throw new GymError('has_gym', 'leave your gym as a member first');
  if (staffOf(db, gym.id).length >= limitsOf(gym).trainers) throw new GymError('limit', 'your gym plan has no room for another trainer');
  const at = new Date(now).toISOString();
  db.gymStaff.push({ gymId: gym.id, userId: owner.id, shift: cleanShift(shift), since: at });
  if (!T.isTrainer(owner)) owner.trainer = { plan: STAFF_PLAN, since: at, viaGym: gym.id };
}

/* ---------------- assignment ---------------- */

const staffIds = (db, gymId) => new Set(staffOf(db, gymId).map(s => s.userId));
const userOf = (db, id) => db.users.find(u => u.id === id) || null;
const hasRoom = (db, trainer) => T.clientIdsOf(db, trainer.id).length < T.limitOf(trainer);

/** The member's current trainer, if that trainer works at this gym. */
export const gymTrainerOf = (db, gym, memberId) => {
  const l = T.linkOf(db, memberId);
  return l && staffIds(db, gym.id).has(l.trainerId) ? l.trainerId : null;
};

function mustMember(db, gym, memberId) {
  const m = db.gymMembers.find(x => x.gymId === gym.id && x.userId === memberId);
  if (!m) throw new GymError('not_member', 'this person is not a member of your gym');
  return m;
}

/** Links a member to one of the gym's trainers, moving them off another gym trainer if needed.
 *  A member who has a trainer from outside the gym keeps them: the gym can't take a client away. */
export function assign(db, gym, memberId, trainerId, now = Date.now()) {
  mustMember(db, gym, memberId);
  if (!staffRow(db, gym.id, trainerId)) throw new GymError('not_staff', 'this trainer does not work at your gym');
  const trainer = userOf(db, trainerId);
  if (!trainer || trainer.disabled || !T.isTrainer(trainer)) throw new GymError('not_staff', 'this trainer cannot take clients right now');
  const link = T.linkOf(db, memberId);
  if (link && link.trainerId === trainerId) return link;
  if (link && !staffIds(db, gym.id).has(link.trainerId)) throw new GymError('has_trainer', 'this member already has a personal trainer outside the gym');
  if (!hasRoom(db, trainer)) throw new GymError('no_room', `${trainer.name} has no free seats`);
  if (link) db.links = db.links.filter(l => l !== link);
  const next = { trainerId, clientId: memberId, created: new Date(now).toISOString(), viaGym: gym.id };
  db.links.push(next);
  return next;
}

export function unassign(db, gym, memberId) {
  mustMember(db, gym, memberId);
  const tid = gymTrainerOf(db, gym, memberId);
  if (!tid) throw new GymError('not_member', 'this member has no trainer from your gym');
  db.links = db.links.filter(l => !(l.clientId === memberId && l.trainerId === tid));
}

/** Clients each staff trainer carries, counting every client (not just gym members): seats are seats. */
export function load(db, gym) {
  return staffOf(db, gym.id).map(s => {
    const u = userOf(db, s.userId);
    return { id: s.userId, name: u?.name || '?', shift: s.shift, clients: T.clientIdsOf(db, s.userId).length, limit: u ? T.limitOf(u) : 0, disabled: !!u?.disabled };
  });
}

/** The trainer a member should go to: someone with a free seat, in the member's shift if anyone
 *  covers it, carrying the fewest clients relative to their seats; ties by name. */
export function suggest(db, gym, memberId) {
  const m = mustMember(db, gym, memberId);
  const open = load(db, gym).filter(t => !t.disabled && t.clients < t.limit);
  const inShift = m.shift ? open.filter(t => !t.shift || t.shift === m.shift) : open;
  const pool = inShift.length ? inShift : open;
  pool.sort((a, b) => a.clients / a.limit - b.clients / b.limit || a.clients - b.clients || a.name.localeCompare(b.name));
  return pool[0] || null;
}

/** Gives every member without a trainer one, oldest members first. Returns how many moved and
 *  how many could not be placed (no free seats anywhere). */
export function autoAssign(db, gym, now = Date.now()) {
  let assigned = 0, left = 0;
  const waiting = membersOf(db, gym.id).filter(m => !T.linkOf(db, m.userId)).sort((a, b) => a.since.localeCompare(b.since));
  for (const m of waiting) {
    const t = suggest(db, gym, m.userId);
    if (!t) { left++; continue; }
    assign(db, gym, m.userId, t.id, now);
    assigned++;
  }
  return { assigned, left };
}

/** A trainer leaves the gym: their gym members go back to the unassigned list, and a trainer
 *  role the gym gave them goes too. Clients they brought themselves stay theirs. */
export function removeStaff(db, gym, trainerId) {
  if (!staffRow(db, gym.id, trainerId)) throw new GymError('not_staff', 'this trainer does not work at your gym');
  const members = new Set(membersOf(db, gym.id).map(m => m.userId));
  db.links = db.links.filter(l => !(l.trainerId === trainerId && members.has(l.clientId)));
  db.gymStaff = db.gymStaff.filter(s => !(s.gymId === gym.id && s.userId === trainerId));
  const u = userOf(db, trainerId);
  if (u?.trainer?.viaGym === gym.id && !T.clientIdsOf(db, u.id).length) delete u.trainer;
  else if (u?.trainer?.viaGym === gym.id) delete u.trainer.viaGym;   // keeps their own clients, now on their own plan
}

/** A member leaves: the gym trainer link goes with the membership. */
export function leave(db, userId) {
  const m = memberRow(db, userId);
  if (!m) throw new GymError('not_member', 'you are not a member of a gym');
  const gym = gymById(db, m.gymId);
  if (gym) { const tid = gymTrainerOf(db, gym, userId); if (tid) db.links = db.links.filter(l => !(l.clientId === userId && l.trainerId === tid)); }
  db.gymMembers = db.gymMembers.filter(x => x !== m);
}

export function setShift(db, gym, kind, userId, shift) {
  const row = kind === 'trainer' ? staffRow(db, gym.id, userId) : db.gymMembers.find(m => m.gymId === gym.id && m.userId === userId);
  if (!row) throw new GymError(kind === 'trainer' ? 'not_staff' : 'not_member', 'no such person at your gym');
  row.shift = cleanShift(shift);
  return row;
}

/** The owner's view. `statusOf(userId)` is the clientStatus of that member (server reads files). */
export function overview(db, gym, statusOf, now = Date.now()) {
  const trainers = load(db, gym).map(t => ({ ...t, members: membersOf(db, gym.id).filter(m => gymTrainerOf(db, gym, m.userId) === t.id).length }));
  const names = Object.fromEntries(trainers.map(t => [t.id, t.name]));
  const members = membersOf(db, gym.id).map(m => {
    const u = userOf(db, m.userId);
    const tid = gymTrainerOf(db, gym, m.userId);
    const outside = !tid && !!T.linkOf(db, m.userId);
    let status = { code: 'new', days: null, last: null };
    try { status = statusOf(m.userId) || status; } catch { /* one member's file never costs the list */ }
    return { id: m.userId, name: u?.name || '?', shift: m.shift, since: m.since, trainerId: tid, trainerName: tid ? names[tid] : null, outside, status };
  });
  return {
    gym: { id: gym.id, name: gym.name, plan: gym.plan, limits: limitsOf(gym), brand: gym.brand || null },
    trainers, members,
    invites: openInvites(db, gym.id, now).map(i => ({ token: i.token, kind: i.kind, created: i.created, expires: new Date(ms(i.created) + daysFor(i.kind) * 86400000).toISOString() }))
  };
}
