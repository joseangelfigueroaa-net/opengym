/* HTTP surface for trainers and their clients (Trainnery).
 *
 * A factory over server.js's helpers, like coach/routes.js: the db and session live there. Every
 * rule (seats, one trainer per client, who may read whom) is in logic.js; this file only maps
 * requests onto it and refusals onto status codes.
 */
import * as T from './logic.js';

export function trainerRoutes({ json, readBody, readSession, requireAdmin, getDb, saveDb, readState }) {
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
  // A TrainerError carries the user-facing message; anything else is a real bug and goes to the
  // server's 500 handler, which never echoes it.
  const fail = (res, e) => {
    if (e instanceof T.TrainerError) return json(res, T.HTTP_FOR[e.code] || 400, { error: e.message, code: e.code });
    throw e;
  };
  const db = () => T.ensureShape(getDb());
  const seats = (trainer, now = Date.now()) => ({
    plan: T.planOf(trainer), limit: T.limitOf(trainer),
    clients: T.clientIdsOf(db(), trainer.id).length,
    open: T.openInvites(db(), trainer.id, now).length
  });

  return {
    /* ------------------------------ trainer ------------------------------ */

    'GET /api/trainer/clients': async (req, res) => {
      const trainer = asTrainer(req, res); if (!trainer) return;
      const now = Date.now();
      const clients = db().links.filter(l => l.trainerId === trainer.id).map(l => {
        const u = db().users.find(x => x.id === l.clientId);
        return u ? T.clientSummary(u, l, readState(u.id), now) : null;
      }).filter(Boolean);
      const invites = T.openInvites(db(), trainer.id, now).map(i => ({ token: i.token, created: i.created }));
      json(res, 200, { clients, invites, seats: seats(trainer, now), inviteDays: T.INVITE_DAYS });
    },

    'GET /api/trainer/client': async (req, res) => {
      const trainer = asTrainer(req, res); if (!trainer) return;
      const id = new URL(req.url, 'http://x').searchParams.get('id');
      try { T.assertCanRead(db(), trainer, id); } catch (e) { return fail(res, e); }
      const u = db().users.find(x => x.id === id);
      if (!u) return json(res, 404, { error: 'no such client' });
      json(res, 200, { client: T.clientDetail(u, T.linkOf(db(), id), readState(id)) });
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

    /* ------------------------------ client ------------------------------ */

    // Public: the join screen shows whose link it is before anyone signs in. The trainer's name
    // is all it gives away — the token is the secret, not the name behind it.
    'GET /api/invite': async (req, res) => {
      const token = new URL(req.url, 'http://x').searchParams.get('token');
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
      const t = link && db().users.find(u => u.id === link.trainerId);
      json(res, 200, { trainer: t ? { name: t.name, since: link.created } : null });
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

    // Makes an account a trainer on a plan, changes the plan, or (plan: null) takes the role away.
    // Taking it away keeps the links: the clients reappear if the role comes back.
    'POST /api/admin/user/trainer': async (req, res) => {
      if (!requireAdmin(req, res)) return;
      const body = await readBody(req);
      const u = db().users.find(x => x.id === body.id);
      if (!u) return json(res, 404, { error: 'no such user' });
      try { T.setTrainer(u, body.plan || null); saveDb(); json(res, 200, { ok: true, id: u.id, trainer: u.trainer || null }); }
      catch (e) { fail(res, e); }
    }
  };
}
