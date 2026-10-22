/* HTTP surface for trainers and their clients (Trainnery).
 *
 * A factory over server.js's helpers, like coach/routes.js: the db and session live there. Every
 * rule (seats, one trainer per client, who may read whom) is in logic.js, records.js, chat.js,
 * content.js and profile.js; this file only maps requests onto them, does the file I/O, and turns refusals
 * into status codes.
 */
import fs from 'node:fs';
import path from 'node:path';
import * as T from './logic.js';
import * as R from './records.js';
import * as C from './chat.js';
import * as K from './content.js';
import * as A from './assign.js';
import * as P from './profile.js';
import { demoClient } from './demo.js';

export function trainerRoutes({ json, readBody, readSession, requireAdmin, getDb, saveDb, readState, writeState, userById, files, dataDir, sendPush }) {
  const signedIn = (req, res) => {
    const user = readSession(req);
    if (!user) json(res, 401, { error: 'not signed in' });
    return user;
  };
  const asTrainer = (req, res) => {
    const user = signedIn(req, res); if (!user) return null;
    if (!T.isTrainer(user)) { json(res, 403, { error: 'this account is not a trainer' }); return null; }
    return user;
  };
  // Each module's error carries the user-facing message; anything else is a real bug and goes to
  // the server's 500 handler, which never echoes it.
  const fail = (res, e) => {
    if (e instanceof T.TrainerError) return json(res, T.HTTP_FOR[e.code] || 400, { error: e.message, code: e.code });
    if (e instanceof R.RecordError || e instanceof C.ChatError || e instanceof K.ContentError || e instanceof A.AssignError || e instanceof P.ProfileError) return json(res, 400, { error: e.message });
    throw e;
  };
  const db = () => T.ensureShape(getDb());
  const query = (req, k) => new URL(req.url, 'http://x').searchParams.get(k);
  const seats = (trainer, now = Date.now()) => ({
    plan: T.planOf(trainer), limit: T.limitOf(trainer),
    clients: T.clientIdsOf(db(), trainer.id).length,
    open: T.openInvites(db(), trainer.id, now).length
  });

  /* ---------- per-user JSON files next to db.json ---------- */
  const safe = id => String(id).replace(/[^a-zA-Z0-9_-]/g, '');
  // through the server's cache and background writer (lib/store.js): validate, then mutate, then store
  const load = name => files.read(name, {});
  const store = (name, obj) => files.write(name, obj);
  const recordsOf = uid => load('records-' + safe(uid) + '.json');
  const chatOf = clientId => load('chat-' + safe(clientId) + '.json');
  const contentOf = trainerId => load('content-' + safe(trainerId) + '.json');
  const assignOf = clientId => load('assign-' + safe(clientId) + '.json');
  const today = () => new Date().toISOString().slice(0, 10);
  const contentDir = trainerId => path.join(dataDir, 'content', safe(trainerId));

  /** The trainer's own client by id, or a refusal already sent. */
  const ownClient = (req, res, trainer, id) => {
    try { T.assertCanRead(db(), trainer, id); } catch (e) { fail(res, e); return null; }
    const u = userById(id);
    if (!u) { json(res, 404, { error: 'no such client' }); return null; }
    return u;
  };
  const trainerOf = user => {
    const link = T.linkOf(db(), user.id);
    return link ? userById(link.trainerId) || null : null;
  };
  const author = (user, role) => ({ id: user.id, role });
  const notify = (uid, title, body, url) => sendPush(uid, { title, body: body.slice(0, 140), tag: 'chat', url }).catch?.(() => {});

  return {
    /* ------------------------------ trainer ------------------------------ */

    /* ------------------------------ profile ------------------------------ */

    // The trainer's own profile, as their clients will see it (GET /api/me/trainer).
    'GET /api/trainer/profile': async (req, res) => {
      const user = asTrainer(req, res); if (!user) return;
      json(res, 200, { profile: P.publicProfile(user) });
    },

    'POST /api/trainer/profile': async (req, res) => {
      const user = asTrainer(req, res); if (!user) return;
      const body = await readBody(req);
      try {
        user.trainerProfile = P.cleanProfile(body || {});
        saveDb();
        json(res, 200, { profile: P.publicProfile(user) });
      } catch (e) { fail(res, e); }
    },

    'GET /api/trainer/clients': async (req, res) => {
      const trainer = asTrainer(req, res); if (!trainer) return;
      const now = Date.now();
      const clients = db().links.filter(l => l.trainerId === trainer.id).map(l => {
        const u = userById(l.clientId);
        if (!u) return null;
        const chat = chatOf(u.id);
        return { ...T.clientSummary(u, l, readState(u.id), recordsOf(u.id), now), unread: C.unreadFor(chat, trainer.id) };
      }).filter(Boolean);
      const invites = T.openInvites(db(), trainer.id, now).map(i => ({ token: i.token, created: i.created }));
      json(res, 200, { clients, invites, seats: seats(trainer, now), inviteDays: T.INVITE_DAYS });
    },

    'GET /api/trainer/client': async (req, res) => {
      const trainer = asTrainer(req, res); if (!trainer) return;
      const id = query(req, 'id');
      const u = ownClient(req, res, trainer, id); if (!u) return;
      json(res, 200, { client: T.clientDetail(u, T.linkOf(db(), id), readState(id), recordsOf(id)) });
    },

    'POST /api/trainer/client/records': async (req, res) => {
      const trainer = asTrainer(req, res); if (!trainer) return;
      const body = await readBody(req);
      const u = ownClient(req, res, trainer, String(body.id || '')); if (!u) return;
      try {
        const file = recordsOf(u.id);
        const entry = R.addEntry(file, R.makeEntry(body, author(trainer, 'trainer')));
        store('records-' + safe(u.id) + '.json', file);
        json(res, 200, { record: entry });
      } catch (e) { fail(res, e); }
    },

    'POST /api/trainer/client/records/delete': async (req, res) => {
      const trainer = asTrainer(req, res); if (!trainer) return;
      const body = await readBody(req);
      const u = ownClient(req, res, trainer, String(body.id || '')); if (!u) return;
      try {
        const file = recordsOf(u.id);
        R.removeEntry(file, String(body.record || ''), trainer.id);
        store('records-' + safe(u.id) + '.json', file);
        json(res, 200, { ok: true });
      } catch (e) { fail(res, e); }
    },

    'POST /api/trainer/invite': async (req, res) => {
      const trainer = asTrainer(req, res); if (!trainer) return;
      try {
        const inv = T.createInvite(db(), trainer);
        saveDb();
        json(res, 200, { invite: { token: inv.token, created: inv.created }, seats: seats(trainer) });
      } catch (e) { fail(res, e); }
    },

    'POST /api/trainer/invite/revoke': async (req, res) => {
      const trainer = asTrainer(req, res); if (!trainer) return;
      const body = await readBody(req);
      try { T.revokeInvite(db(), trainer, String(body.token || '')); saveDb(); json(res, 200, { ok: true, seats: seats(trainer) }); }
      catch (e) { fail(res, e); }
    },

    'POST /api/trainer/client/remove': async (req, res) => {
      const trainer = asTrainer(req, res); if (!trainer) return;
      const body = await readBody(req);
      try { T.unlink(db(), trainer.id, String(body.id || '')); saveDb(); json(res, 200, { ok: true, seats: seats(trainer) }); }
      catch (e) { fail(res, e); }
    },

    /* ------------------------------ assigned workouts ------------------------------ */

    'GET /api/trainer/client/assignments': async (req, res) => {
      const trainer = asTrainer(req, res); if (!trainer) return;
      const u = ownClient(req, res, trainer, query(req, 'id')); if (!u) return;
      const file = assignOf(u.id);
      json(res, 200, { assignments: A.recent(file, today(), 28), profile: file.profile || A.cleanProfile({}) });
    },

    // Sends (or replaces) the workout for one day; the client hears about it by push.
    'POST /api/trainer/client/assign': async (req, res) => {
      const trainer = asTrainer(req, res); if (!trainer) return;
      const body = await readBody(req);
      const u = ownClient(req, res, trainer, String(body.id || '')); if (!u) return;
      try {
        const file = assignOf(u.id);
        const a = A.upsert(file, A.makeAssignment(body, trainer.id));
        store('assign-' + safe(u.id) + '.json', file);
        const when = a.date === today() ? 'today' : a.date;
        notify(u.id, trainer.name, `${a.name} · ${when}`, '#/home');
        json(res, 200, { assignment: a });
      } catch (e) { fail(res, e); }
    },

    // A plan laid over several days (a training model over a month): all or nothing, one push.
    'POST /api/trainer/client/assign/batch': async (req, res) => {
      const trainer = asTrainer(req, res); if (!trainer) return;
      const body = await readBody(req);
      const u = ownClient(req, res, trainer, String(body.id || '')); if (!u) return;
      try {
        const list = A.makeBatch(body.items, trainer.id);
        const file = assignOf(u.id);
        for (const a of list) A.upsert(file, a);
        store('assign-' + safe(u.id) + '.json', file);
        notify(u.id, trainer.name, `${list.length} workouts · ${list[0].date} → ${list[list.length - 1].date}`, '#/home');
        json(res, 200, { assignments: list });
      } catch (e) { fail(res, e); }
    },

    // The trainer's notes on what this client's plan is built around (goal, limitations, focus).
    'GET /api/trainer/client/profile': async (req, res) => {
      const trainer = asTrainer(req, res); if (!trainer) return;
      const u = ownClient(req, res, trainer, query(req, 'id')); if (!u) return;
      json(res, 200, { profile: assignOf(u.id).profile || A.cleanProfile({}) });
    },

    'POST /api/trainer/client/profile': async (req, res) => {
      const trainer = asTrainer(req, res); if (!trainer) return;
      const body = await readBody(req);
      const u = ownClient(req, res, trainer, String(body.id || '')); if (!u) return;
      const file = assignOf(u.id);
      file.profile = A.cleanProfile(body);
      store('assign-' + safe(u.id) + '.json', file);
      json(res, 200, { profile: file.profile });
    },

    'POST /api/trainer/client/assign/delete': async (req, res) => {
      const trainer = asTrainer(req, res); if (!trainer) return;
      const body = await readBody(req);
      const u = ownClient(req, res, trainer, String(body.id || '')); if (!u) return;
      try {
        const file = assignOf(u.id);
        A.remove(file, String(body.assignment || ''));
        store('assign-' + safe(u.id) + '.json', file);
        json(res, 200, { ok: true });
      } catch (e) { fail(res, e); }
    },

    // A client's assignments from yesterday on, from whoever trains them now. Ones left by a
    // former trainer stay in the file but are not served.
    'GET /api/assignments': async (req, res) => {
      const user = signedIn(req, res); if (!user) return;
      const tr = trainerOf(user);
      const items = tr ? A.upcoming(assignOf(user.id), today()).filter(a => a.by === tr.id) : [];
      json(res, 200, { assignments: items, trainer: tr ? { id: tr.id, name: tr.name } : null });
    },

    /* ------------------------------ content ------------------------------ */

    'GET /api/trainer/content': async (req, res) => {
      const trainer = asTrainer(req, res); if (!trainer) return;
      json(res, 200, { posts: (contentOf(trainer.id).posts || []).map(K.publicPost).reverse() });
    },

    'POST /api/trainer/content': async (req, res) => {
      const trainer = asTrainer(req, res); if (!trainer) return;
      const body = await readBody(req);
      try {
        const file = contentOf(trainer.id);
        file.posts = file.posts || [];
        if (file.posts.length >= K.MAX_POSTS) throw new K.ContentError('content limit reached — delete old posts first');
        const { post, bytes } = K.makePost(body);
        if (bytes) {
          await fs.promises.mkdir(contentDir(trainer.id), { recursive: true });
          await fs.promises.writeFile(path.join(contentDir(trainer.id), post.id), bytes);
        }
        file.posts.push(post);
        store('content-' + safe(trainer.id) + '.json', file);
        // every client hears about it once, by push; the app shows it in their Today tab
        for (const cid of T.clientIdsOf(db(), trainer.id)) notify(cid, trainer.name, post.title, '#/home');
        json(res, 200, { post: K.publicPost(post) });
      } catch (e) { fail(res, e); }
    },

    'POST /api/trainer/content/delete': async (req, res) => {
      const trainer = asTrainer(req, res); if (!trainer) return;
      const body = await readBody(req);
      const file = contentOf(trainer.id);
      const post = (file.posts || []).find(p => p.id === String(body.id || ''));
      if (!post) return json(res, 404, { error: 'no such post' });
      file.posts = file.posts.filter(p => p !== post);
      store('content-' + safe(trainer.id) + '.json', file);
      if (post.file) await fs.promises.rm(path.join(contentDir(trainer.id), post.id), { force: true });
      json(res, 200, { ok: true });
    },

    // A client's view of their trainer's library (a trainer gets their own).
    'GET /api/content': async (req, res) => {
      const user = signedIn(req, res); if (!user) return;
      const owner = T.isTrainer(user) ? user : trainerOf(user);
      if (!owner) return json(res, 200, { posts: [], trainer: null });
      json(res, 200, { posts: (contentOf(owner.id).posts || []).map(K.publicPost).reverse(), trainer: { id: owner.id, name: owner.name } });
    },

    // Files are private: only the trainer who posted them and that trainer's clients, signed in.
    'GET /api/content/file': async (req, res) => {
      const user = signedIn(req, res); if (!user) return;
      const trainerId = query(req, 'trainer'), postId = query(req, 'post');
      const allowed = user.id === trainerId || T.isLinked(db(), trainerId, user.id);
      if (!allowed) return json(res, 403, { error: 'forbidden' });
      const post = (contentOf(trainerId).posts || []).find(p => p.id === postId);
      if (!post || !post.file) return json(res, 404, { error: 'not found' });
      // streamed, not read whole: files run to a few MB and several clients may open one at once
      const file = path.join(contentDir(trainerId), safe(post.id));
      let size;
      try { size = (await fs.promises.stat(file)).size; } catch { return json(res, 404, { error: 'not found' }); }
      res.writeHead(200, {
        'Content-Type': post.file.type, 'Content-Length': size, 'Cache-Control': 'private, max-age=3600',
        'Content-Disposition': `inline; filename="${post.file.name.replace(/[^\w .()-]/g, '_')}"`,
        'X-Content-Type-Options': 'nosniff'   // only images and PDF are accepted (content.js TYPES)
      });
      fs.createReadStream(file).on('error', () => res.destroy()).pipe(res);
    },

    /* ------------------------------ chat ------------------------------ */

    // Trainer: ?with=<clientId>. Client: no parameter, the conversation with their trainer.
    // Reading marks the conversation read for the reader.
    'GET /api/chat': async (req, res) => {
      const user = signedIn(req, res); if (!user) return;
      let clientId, other;
      if (T.isTrainer(user) && query(req, 'with')) {
        other = ownClient(req, res, user, query(req, 'with')); if (!other) return;
        clientId = other.id;
      } else {
        other = trainerOf(user);
        if (!other) return json(res, 404, { error: 'you have no trainer to chat with' });
        clientId = user.id;
      }
      const file = chatOf(clientId);
      const unread = C.unreadFor(file, user.id);
      if (unread) { C.markRead(file, user.id); store('chat-' + safe(clientId) + '.json', file); }
      json(res, 200, { messages: C.recent(file), me: user.id, other: { id: other.id, name: other.name }, readByOther: (file.read || {})[other.id] || null });
    },

    'POST /api/chat': async (req, res) => {
      const user = signedIn(req, res); if (!user) return;
      const body = await readBody(req);
      let clientId, other;
      if (T.isTrainer(user) && body.with) {
        other = ownClient(req, res, user, String(body.with)); if (!other) return;
        clientId = other.id;
      } else {
        other = trainerOf(user);
        if (!other) return json(res, 404, { error: 'you have no trainer to chat with' });
        clientId = user.id;
      }
      try {
        const file = chatOf(clientId);
        const msg = C.addMessage(file, user.id, body.text);
        store('chat-' + safe(clientId) + '.json', file);
        notify(other.id, user.name, msg.text, T.isTrainer(other) ? '#/trainer/chat/' + clientId : '#/chat');
        json(res, 200, { message: msg });
      } catch (e) { fail(res, e); }
    },

    // Badge counts: a client's unread from their trainer; a trainer's total across clients.
    'GET /api/chat/unread': async (req, res) => {
      const user = signedIn(req, res); if (!user) return;
      const ids = T.isTrainer(user) ? T.clientIdsOf(db(), user.id) : (trainerOf(user) ? [user.id] : []);
      json(res, 200, { count: ids.reduce((n, id) => n + C.unreadFor(chatOf(id), user.id), 0) });
    },

    /* ------------------------------ client ------------------------------ */

    // A client's own records (the trainer's entries for them included).
    'GET /api/records': async (req, res) => {
      const user = signedIn(req, res); if (!user) return;
      json(res, 200, { records: R.latest(recordsOf(user.id).entries, 500) });
    },

    'POST /api/records': async (req, res) => {
      const user = signedIn(req, res); if (!user) return;
      const body = await readBody(req);
      try {
        const file = recordsOf(user.id);
        const entry = R.addEntry(file, R.makeEntry(body, author(user, 'client')));
        store('records-' + safe(user.id) + '.json', file);
        json(res, 200, { record: entry });
      } catch (e) { fail(res, e); }
    },

    'POST /api/records/delete': async (req, res) => {
      const user = signedIn(req, res); if (!user) return;
      const body = await readBody(req);
      try {
        const file = recordsOf(user.id);
        R.removeEntry(file, String(body.id || ''), user.id);
        store('records-' + safe(user.id) + '.json', file);
        json(res, 200, { ok: true });
      } catch (e) { fail(res, e); }
    },

    // Public: the join screen shows whose link it is before anyone signs in. The trainer's name
    // is all it gives away — the token is the secret, not the name behind it.
    'GET /api/invite': async (req, res) => {
      const token = query(req, 'token');
      try { const { trainer } = T.usableInvite(db(), token); json(res, 200, { trainer: { name: trainer.name } }); }
      catch (e) { fail(res, e); }
    },

    'POST /api/invite/accept': async (req, res) => {
      const user = signedIn(req, res); if (!user) return;
      const body = await readBody(req);
      try {
        const { trainer } = T.acceptInvite(db(), user, body.token);
        saveDb();
        json(res, 200, { trainer: { name: trainer.name } });
      } catch (e) { fail(res, e); }
    },

    'GET /api/me/trainer': async (req, res) => {
      const user = signedIn(req, res); if (!user) return;
      const link = T.linkOf(db(), user.id);
      const t = link && userById(link.trainerId);
      json(res, 200, { trainer: t ? { id: t.id, name: t.name, since: link.created, profile: P.publicProfile(t) } : null });
    },

    'POST /api/me/trainer/leave': async (req, res) => {
      const user = signedIn(req, res); if (!user) return;
      const link = T.linkOf(db(), user.id);
      if (!link) return json(res, 404, { error: 'you have no trainer' });
      T.unlink(db(), link.trainerId, user.id);
      saveDb();
      json(res, 200, { ok: true });
    },

    /* ------------------------------ admin ------------------------------ */

    // Creates a demo client (no passkey, sample data) linked to a trainer, so the trainer can
    // see a filled-in client file. Takes one of the trainer's seats like any client.
    'POST /api/admin/demo-client': async (req, res) => {
      if (!requireAdmin(req, res)) return;
      const body = await readBody(req);
      const trainer = userById(body.trainerId);
      if (!trainer) return json(res, 404, { error: 'no such user' });
      if (!T.isTrainer(trainer)) return json(res, 400, { error: 'this account is not a trainer' });
      if (T.seatsUsed(db(), trainer.id) >= T.limitOf(trainer)) return json(res, 409, { error: 'this trainer has no free seats right now' });
      const { user, state, entries } = demoClient(String(body.name || '').trim().slice(0, 40) || undefined);
      db().users.push(user);
      db().links.push({ trainerId: trainer.id, clientId: user.id, created: user.created });
      writeState(user.id, state);
      store('records-' + safe(user.id) + '.json', { entries });
      saveDb();
      json(res, 200, { client: { id: user.id, name: user.name } });
    },

    // Makes an account a trainer on a plan, changes the plan, or (plan: null) takes the role away.
    // Taking it away keeps the links: the clients reappear if the role comes back.
    'POST /api/admin/user/trainer': async (req, res) => {
      if (!requireAdmin(req, res)) return;
      const body = await readBody(req);
      const u = userById(body.id);
      if (!u) return json(res, 404, { error: 'no such user' });
      try { T.setTrainer(u, body.plan || null); saveDb(); json(res, 200, { ok: true, id: u.id, trainer: u.trainer || null }); }
      catch (e) { fail(res, e); }
    }
  };
}
