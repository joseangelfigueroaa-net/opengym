/* The data layer between the routes and the JSON files in DATA_DIR (Trainnery).
 *
 * Two jobs, both because this process is the only writer of those files:
 *
 * 1. A write-through cache. `read` keeps the parsed file in a bounded LRU, so the hot paths —
 *    a client's chat badge every 30 s, a trainer's client list, the reminder sweep — stop
 *    re-reading and re-parsing the same files. `write` updates the cache first, so the next read
 *    sees the new value at once, before it reaches the disk.
 *
 * 2. Writes off the request path. `write` returns immediately; the file is written
 *    asynchronously, atomically (temp file + rename), one write per file at a time, and only the
 *    latest content is written when several updates pile up. `flush()` waits for everything
 *    pending — the server calls it before exiting so a deploy never loses a write.
 *
 * What it does not do: notice files changed behind its back. Restoring a backup into DATA_DIR
 * needs a restart, exactly as db.json always has.
 *
 * Callers own the objects `read` returns (they are the cached copies): validate first, then
 * mutate, then `write` — never mutate and bail out, or the cache and the disk disagree.
 */
import fs from 'node:fs';
import path from 'node:path';

export function createStore({ dir, maxEntries = 300, log = console.error } = {}) {
  const cache = new Map();               // name -> parsed value, in least-recently-used order
  const pending = new Map();             // name -> latest serialized content not yet on disk
  const running = new Map();             // name -> promise of the write loop for that file
  let seq = 0;

  const file = name => path.join(dir, name);
  const touch = (name, value) => {
    cache.delete(name);
    cache.set(name, value);
    if (cache.size > maxEntries) cache.delete(cache.keys().next().value);
  };

  /** The parsed file, or `fallback` when it does not exist or cannot be parsed. */
  function read(name, fallback = {}) {
    if (cache.has(name)) { const v = cache.get(name); touch(name, v); return v; }
    let v;
    try { v = JSON.parse(fs.readFileSync(file(name), 'utf8')); } catch { return fallback; }
    touch(name, v);
    return v;
  }

  /** Replaces the file's content: in the cache now, on disk shortly. */
  function write(name, value, serialized = JSON.stringify(value)) {
    touch(name, value);
    pending.set(name, serialized);
    if (!running.has(name)) running.set(name, drain(name));
  }

  async function drain(name) {
    try {
      while (pending.has(name)) {
        const content = pending.get(name);
        pending.delete(name);
        const tmp = `${file(name)}.${process.pid}.${++seq}.tmp`;
        try {
          await fs.promises.writeFile(tmp, content);
          await fs.promises.rename(tmp, file(name));
        } catch (e) {
          log('store: write failed, retrying', name, e.message);
          await fs.promises.rm(tmp, { force: true }).catch(() => {});
          if (!pending.has(name)) pending.set(name, content);   // a newer write wins over the retry
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    } finally { running.delete(name); }
  }

  /** Resolves once everything written so far is on disk. */
  async function flush() {
    while (running.size) await Promise.all([...running.values()]);
  }

  /** Drops a file from the cache and the disk (pending writes included). */
  async function remove(name) {
    cache.delete(name);
    pending.delete(name);
    await running.get(name);
    await fs.promises.rm(file(name), { force: true });
  }

  const stats = () => ({ cached: cache.size, pending: pending.size, writing: running.size });
  return { read, write, flush, remove, stats };
}
