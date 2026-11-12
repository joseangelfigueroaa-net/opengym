/* Gym attendance (Trainnery): the days each member came in, filed per gym.
 *
 *   visits-<gymId>.json   { days: { <userId>: ['2026-11-11', ...] } }   one entry per day, oldest first
 *
 * A visit is recorded by the member ("I'm at the gym") or by the gym's reception. It only says
 * someone came in on a day: no times, no place, nothing about what they did.
 */

export const KEEP_DAYS = 180;              // entries per member; older ones drop off
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const DAY = 86400000;

export class VisitError extends Error {}

/** The day to record: the member's own calendar day if they sent one within a day of the
 *  server's (time zones), otherwise the server's. Never a day in the past or the future. */
export function visitDay(sent, now = Date.now()) {
  const server = new Date(now).toISOString().slice(0, 10);
  if (typeof sent !== 'string' || !ISO_DAY.test(sent) || isNaN(Date.parse(sent))) return server;
  return Math.abs(Date.parse(sent) - Date.parse(server)) <= DAY ? sent : server;
}

/** Adds a visit; false when that day was already recorded. */
export function addVisit(file, userId, day) {
  if (!ISO_DAY.test(String(day || ''))) throw new VisitError('not a valid day');
  file.days = file.days && typeof file.days === 'object' ? file.days : {};
  const list = Array.isArray(file.days[userId]) ? file.days[userId] : [];
  if (list.includes(day)) return false;
  list.push(day);
  list.sort();
  file.days[userId] = list.slice(-KEEP_DAYS);
  return true;
}

export const visitsOf = (file, userId) => (Array.isArray(file?.days?.[userId]) ? file.days[userId] : []);

/** Visits on or after `since` (an ISO day). */
export const countSince = (file, userId, since) => visitsOf(file, userId).filter(d => d >= since).length;

/** Who came in on a day. */
export const presentOn = (file, day) => Object.entries(file?.days || {}).filter(([, l]) => Array.isArray(l) && l.includes(day)).map(([id]) => id);

/** A member leaves the gym or their account is deleted: their days go with them. */
export function forget(file, userId) {
  if (file?.days && file.days[userId]) { delete file.days[userId]; return true; }
  return false;
}
