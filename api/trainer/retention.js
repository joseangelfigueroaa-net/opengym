/* Member retention at a gym (Trainnery): when someone starts slipping away and whether they come back.
 *
 *   retention-<gymId>.json   { episodes: [{ id, userId, trainerId, start, end, outcome }] }
 *
 * An episode opens the day a member is seen inactive (no workout, record or visit for longer than
 * their own rhythm allows, see logic.inactiveAfter). It closes as:
 *   recovered  they showed activity again within RECOVERY_DAYS of turning inactive
 *   lost       RECOVERY_DAYS passed with no sign of them
 *   left       they left the gym (or the account was deleted) while it was open
 * A recovered member is someone a trainer can be credited with: the episode keeps the trainer
 * they had when it opened.
 */

export const RECOVERY_DAYS = 30;
export const KEEP = 1000;                  // closed episodes kept per gym; the oldest drop off
const DAY = 86400000;
const days = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / DAY);

/** Brings the episodes up to date with today's statuses. `members` is [{ id, trainerId, status }]
 *  for everyone at the gym now. Returns true when something changed (so the caller saves). */
export function track(file, members, today) {
  file.episodes = Array.isArray(file.episodes) ? file.episodes : [];
  const open = new Map(file.episodes.filter(e => !e.end).map(e => [e.userId, e]));
  const here = new Set(members.map(m => m.id));
  let changed = false;
  const close = (e, outcome) => { e.end = today; e.outcome = outcome; changed = true; };
  for (const m of members) {
    const e = open.get(m.id), inactive = m.status?.code === 'inactive';
    if (!e && inactive) {
      // `since` is their last activity, so "back after N days" counts the real gap, not the day we noticed
      file.episodes.push({ id: m.id + ':' + today, userId: m.id, trainerId: m.trainerId || null, start: today, since: m.status.last || today, end: null, outcome: null });
      changed = true;
    } else if (e && !inactive && m.status?.code !== 'new') close(e, 'recovered');
    else if (e && inactive && days(e.start, today) > RECOVERY_DAYS) close(e, 'lost');
  }
  for (const [uid, e] of open) if (!here.has(uid) && !e.end) close(e, 'left');
  const closed = file.episodes.filter(e => e.end);
  if (closed.length > KEEP) {
    const drop = new Set(closed.slice(0, closed.length - KEEP));
    file.episodes = file.episodes.filter(e => !drop.has(e));
    changed = true;
  }
  return changed;
}

/** The month's numbers for the owner: who turned inactive, who came back (and with which
 *  trainer), who was lost, who is still slipping away. `month` is 'YYYY-MM'. */
export function report(file, month) {
  const eps = Array.isArray(file?.episodes) ? file.episodes : [];
  const inMonth = d => typeof d === 'string' && d.slice(0, 7) === month;
  const recovered = eps.filter(e => e.outcome === 'recovered' && inMonth(e.end))
    .map(e => ({ userId: e.userId, trainerId: e.trainerId, start: e.start, end: e.end, days: days(e.since || e.start, e.end) }));
  return {
    month,
    flagged: eps.filter(e => inMonth(e.start)).length,
    recovered,
    lost: eps.filter(e => e.outcome === 'lost' && inMonth(e.end)).length,
    open: eps.filter(e => !e.end).map(e => ({ userId: e.userId, trainerId: e.trainerId, start: e.start }))
  };
}

/** A member leaves or is deleted: an open episode closes as 'left'. */
export function forget(file, userId, today) {
  const e = (file?.episodes || []).find(x => x.userId === userId && !x.end);
  if (e) { e.end = today; e.outcome = 'left'; return true; }
  return false;
}
