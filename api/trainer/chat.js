/* Trainer <-> client chat (Trainnery). One conversation per client — a client has one trainer:
 *
 *   chat-<clientId>.json   { messages: [{ id, from, text, at }], read: { <uid>: iso } }
 *
 * Who may read or write it is decided by the link in db.json (logic.js), not by this file:
 * a conversation outlives an unlink, and reappears if the same pair links again.
 */
import crypto from 'node:crypto';

export const MAX_TEXT = 2000;
export const MAX_KEEP = 2000;          // oldest messages are dropped past this
export const PAGE = 200;               // most recent messages returned per read

export class ChatError extends Error {}

export function addMessage(file, from, text, now = Date.now()) {
  text = String(text || '').trim();
  if (!text) throw new ChatError('write a message first');
  if (text.length > MAX_TEXT) throw new ChatError(`messages are limited to ${MAX_TEXT} characters`);
  file.messages = file.messages || [];
  const msg = { id: crypto.randomBytes(8).toString('hex'), from, text, at: new Date(now).toISOString() };
  file.messages.push(msg);
  if (file.messages.length > MAX_KEEP) file.messages = file.messages.slice(-MAX_KEEP);
  markRead(file, from, now);                // your own message is read by you
  return msg;
}

export function markRead(file, uid, now = Date.now()) {
  file.read = file.read || {};
  file.read[uid] = new Date(now).toISOString();
}

/** Messages from the other person newer than this reader's last read mark. */
export function unreadFor(file, uid) {
  const since = (file.read || {})[uid] || '';
  return (file.messages || []).filter(m => m.from !== uid && m.at > since).length;
}

export function lastMessage(file) {
  const m = file.messages || [];
  return m.length ? m[m.length - 1] : null;
}

/** The page a client renders: the newest PAGE messages, oldest first. */
export const recent = file => (file.messages || []).slice(-PAGE);
