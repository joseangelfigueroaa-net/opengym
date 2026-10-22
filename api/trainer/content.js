/* A trainer's content library (Trainnery): posts their clients see in the app.
 *
 *   content-<trainerId>.json        { posts: [{ id, title, body, link, file, at }] }
 *   content/<trainerId>/<postId>    the attached file, if any (served only to signed-in
 *                                   clients of that trainer and the trainer)
 *
 * Files travel as base64 inside the JSON body, so they are capped well under the API's 5 MB
 * request limit; video goes in as a link (YouTube, Drive…), not an upload.
 */
import crypto from 'node:crypto';

export const MAX_FILE = 3.5 * 1024 * 1024;
export const TYPES = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
  'application/pdf': 'pdf'
};
export const MAX_POSTS = 500;

export class ContentError extends Error {}

/** Validates a new post; returns { post, bytes } where bytes is the decoded file or null. */
export function makePost({ title, body, link, file }, now = Date.now()) {
  title = String(title || '').trim().slice(0, 120);
  body = String(body || '').trim().slice(0, 5000);
  link = String(link || '').trim().slice(0, 500);
  if (!title) throw new ContentError('give the post a title');
  if (link) {
    let u;
    try { u = new URL(link); } catch { throw new ContentError('the link is not a valid address'); }
    if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new ContentError('links must start with https://');
  }
  let bytes = null, meta = null;
  if (file && file.data) {
    const type = String(file.type || '');
    if (!Object.hasOwn(TYPES, type)) throw new ContentError('only images (JPG, PNG, WebP, GIF) and PDF can be uploaded; share video as a link');
    bytes = Buffer.from(String(file.data), 'base64');
    if (!bytes.length) throw new ContentError('the file is empty');
    if (bytes.length > MAX_FILE) throw new ContentError('files are limited to 3.5 MB; share larger ones as a link');
    if (!looksLike(type, bytes)) throw new ContentError('the file does not match its type');
    meta = { name: String(file.name || 'file').replace(/[^\w.\- ]/g, '_').slice(0, 80), type, size: bytes.length };
  }
  if (!body && !link && !bytes) throw new ContentError('add some text, a link or a file');
  const post = { id: crypto.randomBytes(8).toString('hex'), title, body, link, file: meta, at: new Date(now).toISOString() };
  return { post, bytes };
}

// Magic bytes, so a renamed executable can't be served back as "image/png".
function looksLike(type, b) {
  const hex = b.subarray(0, 12).toString('hex');
  if (type === 'image/png') return hex.startsWith('89504e47');
  if (type === 'image/jpeg') return hex.startsWith('ffd8ff');
  if (type === 'image/gif') return hex.startsWith('47494638');
  if (type === 'image/webp') return hex.startsWith('52494646') && b.subarray(8, 12).toString() === 'WEBP';
  if (type === 'application/pdf') return b.subarray(0, 5).toString() === '%PDF-';
  return false;
}

/** What a client sees of a post: no server paths. */
export const publicPost = p => ({ id: p.id, title: p.title, body: p.body, link: p.link, at: p.at,
  file: p.file ? { name: p.file.name, type: p.file.type, size: p.file.size } : null });
