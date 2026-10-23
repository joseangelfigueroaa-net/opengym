/* A client's progress photos (Trainnery): their own body photos, seen by them and by the trainer
 * they are linked to.
 *
 *   photos-<clientId>.json        { items: [{ id, d, note, type, size, at }] }
 *   photos/<clientId>/<photoId>   the image itself, served only through the authenticated route
 *
 * Images only (JPG, PNG, WebP), with the same magic-byte check and size cap as content posts.
 */
import crypto from 'node:crypto';
import { looksLike } from './content.js';

export const MAX_PHOTO = 3.5 * 1024 * 1024;
export const PHOTO_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
export const MAX_PHOTOS = 300;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export class PhotoError extends Error {}

/** Validates a new photo; returns { item, bytes }. */
export function makePhoto({ d, note, file }, now = Date.now()) {
  if (!ISO_DAY.test(String(d || '')) || isNaN(Date.parse(d))) throw new PhotoError('a valid date is required');
  if (Date.parse(d) > now + 86400000) throw new PhotoError('the date cannot be in the future');
  if (!file || !file.data) throw new PhotoError('choose a photo');
  const type = String(file.type || '');
  if (!Object.hasOwn(PHOTO_TYPES, type)) throw new PhotoError('photos must be JPG, PNG or WebP');
  const bytes = Buffer.from(String(file.data), 'base64');
  if (!bytes.length) throw new PhotoError('the photo is empty');
  if (bytes.length > MAX_PHOTO) throw new PhotoError('photos are limited to 3.5 MB');
  if (!looksLike(type, bytes)) throw new PhotoError('the file does not match its type');
  const item = {
    id: crypto.randomBytes(8).toString('hex'), d, note: String(note || '').trim().slice(0, 200),
    type, size: bytes.length, at: new Date(now).toISOString()
  };
  return { item, bytes };
}

/** What the app sees of a photo: no server paths. */
export const publicPhoto = p => ({ id: p.id, d: p.d, note: p.note, type: p.type, size: p.size, at: p.at });
