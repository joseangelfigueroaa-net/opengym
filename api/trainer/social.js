/* Reactions and comments on what a client and their trainer share (Trainnery).
 *
 *   social-<ownerId>.json   { reactions: { "<kind>:<id>": [{ by, e }] }, comments: { "<recordId>": [{ id, by, text, at }] } }
 *
 * The owner is whose data it is. A client owns their workouts (w:), their records (r:) and the
 * comments on their meals. A trainer owns their content posts (p:), which their clients react
 * to. Only someone linked to the owner may react, and the trainer alone comments on a client's
 * meals. One reaction per person per item: the same emoji again takes it back.
 */
import crypto from 'node:crypto';
import * as T from './logic.js';

export const EMOJI = ['❤️', '👍', '🔥', '💪', '👏', '🎉'];
export const MAX_COMMENT = 500;
export const MAX_COMMENTS_PER_MEAL = 50;
const KEY = /^(w|r|p):[A-Za-z0-9_-]{1,64}$/;

export class SocialError extends Error {}

/** Who may see an owner's reactions and comments: the owner, and anyone linked to them. */
export const canSee = (db, viewerId, ownerId) =>
  viewerId === ownerId || T.isLinked(db, ownerId, viewerId) || T.isLinked(db, viewerId, ownerId);

/** Checks the item key against the owner: a trainer's items are content (p:), a client's are
 *  workouts and records (w:, r:). */
export function checkKey(owner, key) {
  if (!KEY.test(String(key || ''))) throw new SocialError('unknown item');
  const kind = key.slice(0, 1);
  if (T.isTrainer(owner) ? kind !== 'p' : kind === 'p') throw new SocialError('unknown item');
}

/** Sets this person's reaction on an item; the same emoji again removes it. Returns the item's
 *  reactions after the change. */
export function react(file, { reactorId, key, e }) {
  if (!EMOJI.includes(e)) throw new SocialError('choose one of the listed reactions');
  file.reactions = file.reactions || {};
  const before = file.reactions[key] || [];
  const mine = before.find(x => x.by === reactorId);
  const rest = before.filter(x => x.by !== reactorId);
  if (!mine || mine.e !== e) rest.push({ by: reactorId, e });
  if (rest.length) file.reactions[key] = rest; else delete file.reactions[key];
  return rest;
}

/** A trainer's note on one of a client's meals. */
export function comment(file, { reactorId, recordId, text, now = Date.now() }) {
  const body = String(text || '').trim().slice(0, MAX_COMMENT);
  if (!body) throw new SocialError('write something first');
  file.comments = file.comments || {};
  const list = file.comments[recordId] || [];
  if (list.length >= MAX_COMMENTS_PER_MEAL) throw new SocialError('this meal already has the most comments allowed');
  const c = { id: crypto.randomBytes(6).toString('hex'), by: reactorId, text: body, at: new Date(now).toISOString() };
  file.comments[recordId] = [...list, c];
  return c;
}

/** Only whoever wrote a comment can take it back. */
export function removeComment(file, commentId, authorId) {
  for (const [recordId, list] of Object.entries(file.comments || {})) {
    const c = list.find(x => x.id === commentId);
    if (!c) continue;
    if (c.by !== authorId) throw new SocialError('only whoever wrote a comment can delete it');
    file.comments[recordId] = list.filter(x => x.id !== commentId);
    if (!file.comments[recordId].length) delete file.comments[recordId];
    return;
  }
  throw new SocialError('no such comment');
}

export const summaryOf = file => ({ reactions: file.reactions || {}, comments: file.comments || {}, emoji: EMOJI });
