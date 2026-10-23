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
import * as SOC from './social.js';
import * as PH from './photos.js';
import { estimateMeal, prefetchMeal } from './nutrition.js';
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
    if (e instanceof R.RecordError || e instanceof C.ChatError || e instanceof K.ContentError || e instanceof A.AssignError || e instanceof P.ProfileError || e instanceof SOC.SocialError || e instanceof PH.PhotoError) return json(res, 400, { error: e.message });
    throw e;
  };
  const db = () => T.ensureShape(getDb());
  const NUTRITION_PLAN = 'meals and macros come with the Silver plan or higher';
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
  // Chat and assignments are filed per client and outlive an unlink, so whatever a trainer reads
  // is cut down to the current pairing: messages since this link was made, assignments they sent.
  const chatSince = (clientId, link) => {
    const file = chatOf(clientId);
    const from = link?.created || '';
    return { ...file, messages: (file.messages || []).filter(m => (m.at || '') >= from) };
  };
  // The trainer's notes on a client carry who wrote them; notes from before that field existed
  // are dropped when the pair unlinks (dropPairData), so an unsigned one is the current trainer's.
  const profileFor = (file, trainerId) => file.profile && (!file.profile.by || file.profile.by === trainerId) ? file.profile : null;
  const dropPairData = clientId => {
    const file = assignOf(clientId);
    if (file.profile) { file.profile = null; store('assign-' + safe(clientId) + '.json', file); }
  };
  const mine = (file, trainerId) => ({ ...file, items: (file.items || []).filter(a => a.by === trainerId) });
  const today = () => new Date().toISOString().slice(0, 10);
  const contentDir = trainerId => path.join(dataDir, 'content', safe(trainerId));
  const loadSocial = ownerId => load('social-' + safe(ownerId) + '.json');
  const photosOf = ownerId => load('photos-' + safe(ownerId) + '.json');
  const photoDir = ownerId => path.join(dataDir, 'photos', safe(ownerId));
  // a client's photos are seen by the client and by the trainer they are linked to
  const canPhotos = (user, ownerId) => user.id === ownerId || T.isLinked(db(), user.id, ownerId);

  /** The trainer's own client by id, or a refusal already sent. */
  const ownClient = (req, res, trainer, id) => {
    try { T.assertCanRead(db(), trainer, id); } catch (e) { fail(res, e); return null; }
    const u = userById(id);
    if (!u) { json(res, 404, { error: 'no such client' }); return null; }
    return u;
  };
  // A disabled trainer, or one an admin demoted, trains nobody: no chat, no plan features.
  const trainerOf = user => {
    const link = T.linkOf(db(), user.id);
    const t = link && userById(link.trainerId);
    return t && !t.disabled && T.isTrainer(t) ? t : null;
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
        // one client's data must never cost the trainer the whole list
        try {
          return { ...T.clientSummary(u, l, readState(u.id), recordsOf(u.id), now), unread: C.unreadFor(chatSince(u.id, l), trainer.id) };
        } catch (e) {
          console.error('client summary failed', u.id, e.message);
          return { id: u.id, name: u.name, since: l.created, workouts: 0, status: { code: 'new', days: null, last: null }, unread: 0 };
        }
      }).filter(Boolean);
      const invites = T.openInvites(db(), trainer.id, now).map(i => ({ token: i.token, created: i.created }));
      json(res, 200, { clients, invites, seats: seats(trainer, now), inviteDays: T.INVITE_DAYS });
    },

    'GET /api/trainer/client': async (req, res) => {
      const trainer = asTrainer(req, res); if (!trainer) return;
      const id = query(req, 'id');
      const u = ownClient(req, res, trainer, id); if (!u) return;
      json(res, 200, { client: { ...T.clientDetail(u, T.linkOf(db(), id), readState(id), recordsOf(id)), macroGoal: T.hasFeature(trainer, 'macros') ? profileFor(assignOf(id), trainer.id)?.macros || null : null } });
    },

    'POST /api/trainer/client/records': async (req, res) => {
      const trainer = asTrainer(req, res); if (!trainer) return;
      const body = await readBody(req);
      const u = ownClient(req, res, trainer, String(body.id || '')); if (!u) return;
      if (body.kind === 'meal' && !T.hasFeature(trainer, 'meals')) return json(res, 403, { error: NUTRITION_PLAN });
      if (body.kind === 'meal') await prefetchMeal(body.v?.text);
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
      try { T.unlink(db(), trainer.id, String(body.id || '')); dropPairData(String(body.id || '')); saveDb(); json(res, 200, { ok: true, seats: seats(trainer) }); }
      catch (e) { fail(res, e); }
    },

    /* ------------------------------ assigned workouts ------------------------------ */

    'GET /api/trainer/client/assignments': async (req, res) => {
      const trainer = asTrainer(req, res); if (!trainer) return;
      const u = ownClient(req, res, trainer, query(req, 'id')); if (!u) return;
      const file = assignOf(u.id);
      json(res, 200, { assignments: A.recent(mine(file, trainer.id), today(), 28), profile: profileFor(file, trainer.id) || A.cleanProfile({}) });
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
      json(res, 200, { profile: profileFor(assignOf(u.id), trainer.id) || A.cleanProfile({}) });
    },

    'POST /api/trainer/client/profile': async (req, res) => {
      const trainer = asTrainer(req, res); if (!trainer) return;
      const body = await readBody(req);
      const u = ownClient(req, res, trainer, String(body.id || '')); if (!u) return;
      const file = assignOf(u.id);
      file.profile = { ...A.cleanProfile(body), by: trainer.id };
      if (!T.hasFeature(trainer, 'macros')) file.profile.macros = null;
      store('assign-' + safe(u.id) + '.json', file);
      json(res, 200, { profile: file.profile });
    },

    'POST /api/trainer/client/assign/delete': async (req, res) => {
      const trainer = asTrainer(req, res); if (!trainer) return;
      const body = await readBody(req);
      const u = ownClient(req, res, trainer, String(body.id || '')); if (!u) return;
      try {
        const file = assignOf(u.id);
        const id = String(body.assignment || '');
        // a former trainer's items stay on file but are not this trainer's to delete
        if (!(file.items || []).some(a => a.id === id && a.by === trainer.id)) throw new A.AssignError('no such assignment');
        A.remove(file, id);
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
        for (const cid of T.clientIdsOf(db(), trainer.id)) notify(cid, trainer.name, post.title, '#/content');
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
      const view = chatSince(clientId, T.linkOf(db(), clientId));
      const unread = C.unreadFor(view, user.id);
      if (unread) { C.markRead(file, user.id); store('chat-' + safe(clientId) + '.json', file); }
      json(res, 200, { messages: C.recent(view), me: user.id, other: { id: other.id, name: other.name }, readByOther: (file.read || {})[other.id] || null });
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
      json(res, 200, { count: ids.reduce((n, id) => n + C.unreadFor(chatSince(id, T.linkOf(db(), id)), user.id), 0) });
    },

    /* ------------------------------ client ------------------------------ */

    // A client's own records (the trainer's entries for them included).
    'GET /api/records': async (req, res) => {
      const user = signedIn(req, res); if (!user) return;
      // `day` is the client's own today, so the totals match the day they are looking at
      const day = /^\d{4}-\d{2}-\d{2}$/.test(query(req, 'day') || '') ? query(req, 'day') : today();
      const entries = recordsOf(user.id).entries;
      json(res, 200, { records: R.latest(entries, 500), today: R.dayTotals(entries, day) });
    },

    'POST /api/records': async (req, res) => {
      const user = signedIn(req, res); if (!user) return;
      const body = await readBody(req);
      if (body.kind === 'meal' && !T.hasFeature(trainerOf(user), 'meals')) return json(res, 403, { error: NUTRITION_PLAN });
      if (body.kind === 'meal') await prefetchMeal(body.v?.text);
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

    /* ------------------------------ reactions and comments ------------------------------ */

    // What a meal description comes to, shown while the client types. Saving estimates it again.
    'POST /api/nutrition/estimate': async (req, res) => {
      const user = signedIn(req, res); if (!user) return;
      const body = await readBody(req);
      const text = String(body.text || '').slice(0, 300);
      await prefetchMeal(text);
      json(res, 200, { estimate: estimateMeal(text) });
    },

    // Reactions and comments on one owner's items (default: the signed-in user's own). Anyone
    // linked to the owner may read them.
    'GET /api/social': async (req, res) => {
      const user = signedIn(req, res); if (!user) return;
      const owner = userById(query(req, 'owner') || user.id);
      if (!owner || !SOC.canSee(db(), user.id, owner.id)) return json(res, 404, { error: 'nothing to show' });
      json(res, 200, SOC.summaryOf(loadSocial(owner.id)));
    },

    // Toggles this person's reaction on an item: a client's trainer on their workouts and records,
    // a client on the trainer's content.
    'POST /api/social/react': async (req, res) => {
      const user = signedIn(req, res); if (!user) return;
      const body = await readBody(req);
      const owner = userById(String(body.owner || ''));
      if (!owner || owner.id === user.id || !SOC.canSee(db(), user.id, owner.id)) return json(res, 404, { error: 'nothing to react to' });
      try {
        SOC.checkKey(owner, body.key);
        const file = loadSocial(owner.id);
        const reactions = SOC.react(file, { reactorId: user.id, key: String(body.key), e: String(body.e || '') });
        store('social-' + safe(owner.id) + '.json', file);
        json(res, 200, { reactions });
      } catch (e) { fail(res, e); }
    },

    // A trainer's comment on one of a client's meals.
    'POST /api/social/comment': async (req, res) => {
      const user = signedIn(req, res); if (!user) return;
      const body = await readBody(req);
      const owner = userById(String(body.owner || ''));
      if (!owner || !T.isTrainer(user) || !T.isLinked(db(), user.id, owner.id)) return json(res, 404, { error: 'nothing to comment on' });
      const meal = (recordsOf(owner.id).entries || []).find(e => e.id === String(body.record || '') && e.kind === 'meal');
      if (!meal) return json(res, 404, { error: 'no such meal' });
      try {
        const file = loadSocial(owner.id);
        const comment = SOC.comment(file, { reactorId: user.id, recordId: meal.id, text: body.text });
        store('social-' + safe(owner.id) + '.json', file);
        notify(owner.id, user.name, comment.text, '#/log');
        json(res, 200, { comment });
      } catch (e) { fail(res, e); }
    },

    'POST /api/social/comment/delete': async (req, res) => {
      const user = signedIn(req, res); if (!user) return;
      const body = await readBody(req);
      const owner = userById(String(body.owner || ''));
      if (!owner || !SOC.canSee(db(), user.id, owner.id)) return json(res, 404, { error: 'nothing to show' });
      try {
        const file = loadSocial(owner.id);
        SOC.removeComment(file, String(body.id || ''), user.id);
        store('social-' + safe(owner.id) + '.json', file);
        json(res, 200, { ok: true });
      } catch (e) { fail(res, e); }
    },

    /* ------------------------------ progress photos ------------------------------ */

    // A client's photos, newest first.
    'GET /api/photos': async (req, res) => {
      const user = signedIn(req, res); if (!user) return;
      const owner = query(req, 'owner') || user.id;
      if (!canPhotos(user, owner)) return json(res, 404, { error: 'nothing to show' });
      json(res, 200, { photos: (photosOf(owner).items || []).map(PH.publicPhoto).reverse() });
    },

    'POST /api/photos': async (req, res) => {
      const user = signedIn(req, res); if (!user) return;
      const body = await readBody(req);
      try {
        const file = photosOf(user.id);
        file.items = file.items || [];
        if (file.items.length >= PH.MAX_PHOTOS) throw new PH.PhotoError('photo limit reached — delete old ones first');
        const { item, bytes } = PH.makePhoto(body);
        await fs.promises.mkdir(photoDir(user.id), { recursive: true });
        await fs.promises.writeFile(path.join(photoDir(user.id), item.id), bytes);
        file.items.push(item);
        store('photos-' + safe(user.id) + '.json', file);
        json(res, 200, { photo: PH.publicPhoto(item) });
      } catch (e) { fail(res, e); }
    },

    // Files are private: the client and their linked trainer, signed in.
    'GET /api/photos/file': async (req, res) => {
      const user = signedIn(req, res); if (!user) return;
      const owner = query(req, 'owner') || user.id;
      if (!canPhotos(user, owner)) return json(res, 404, { error: 'not found' });
      const item = (photosOf(owner).items || []).find(p => p.id === query(req, 'id'));
      if (!item) return json(res, 404, { error: 'not found' });
      const file = path.join(photoDir(owner), safe(item.id));
      let size;
      try { size = (await fs.promises.stat(file)).size; } catch { return json(res, 404, { error: 'not found' }); }
      res.writeHead(200, {
        'Content-Type': item.type, 'Content-Length': size, 'Cache-Control': 'private, max-age=3600',
        'X-Content-Type-Options': 'nosniff'
      });
      fs.createReadStream(file).on('error', () => res.destroy()).pipe(res);
    },

    // Only the client removes their own photos.
    'POST /api/photos/delete': async (req, res) => {
      const user = signedIn(req, res); if (!user) return;
      const body = await readBody(req);
      const file = photosOf(user.id);
      const item = (file.items || []).find(p => p.id === String(body.id || ''));
      if (!item) return json(res, 404, { error: 'no such photo' });
      file.items = file.items.filter(p => p !== item);
      store('photos-' + safe(user.id) + '.json', file);
      await fs.promises.rm(path.join(photoDir(user.id), safe(item.id)), { force: true });
      json(res, 200, { ok: true });
    },

    // Public: the join screen shows whose link it is before anyone signs in. The trainer's name
    // is all it gives away — the token is the secret, not the name behind it.
    'GET /api/invite': async (req, res) => {
      const token = query(req, 'token');
      try { const { trainer } = T.usableInvite(db(), token, Date.now(), readSession(req)); json(res, 200, { trainer: { name: trainer.name } }); }
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
      json(res, 200, { trainer: t ? {
        id: t.id, name: t.name, since: link.created, profile: P.publicProfile(t),
        features: T.featuresOf(t), macroGoal: T.hasFeature(t, 'macros') ? profileFor(assignOf(user.id), t.id)?.macros || null : null
      } : null });
    },

    'POST /api/me/trainer/leave': async (req, res) => {
      const user = signedIn(req, res); if (!user) return;
      const link = T.linkOf(db(), user.id);
      if (!link) return json(res, 404, { error: 'you have no trainer' });
      T.unlink(db(), link.trainerId, user.id);
      dropPairData(user.id);
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
