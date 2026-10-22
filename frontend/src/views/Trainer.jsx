import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { api } from '../lib/api.js'
import { fmtDate, fmtNum } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import { shareInvite, statusTag } from '../lib/trainer.js'
import { confirmSheet } from '../sheets.jsx'
import SignOutButton from '../components/SignOutButton.jsx'
import Icon from '../components/Icon.jsx'
import { LogoMark } from '../components/Logo.jsx'
import { Button } from '../components/ui.jsx'

// A trainer's home: who needs attention, their seats, the links still waiting to be used, and
// the clients who joined. Guarded server-side too — every call here 403s for an account
// without the trainer role.

const PLAN = { free: 'Free', silver: 'Silver' }
// Who needs a look first: inactive, then stalled, then new, then on track; ties by name.
const RANK = { inactive: 0, stalled: 1, new: 2, ok: 3 }

export default function Trainer() {
  const nav = useNavigate()
  const user = useStore(s => s.user)
  const toast = useUI(s => s.toast)
  const [d, setD] = useState(null)

  const load = () => api('/api/trainer/clients').then(setD).catch(e => toast(e.message))
  // Keyed on the role, not on mount: the cached profile may predate an admin granting it, and
  // boot's /api/me fills it in a moment after this screen first renders.
  useEffect(() => { if (user?.trainer) load() }, [!!user?.trainer])
  if (!user?.trainer) return null

  const full = d && d.seats.clients + d.seats.open >= d.seats.limit
  const invite = () => api('/api/trainer/invite', { method: 'POST', body: '{}' })
    .then(async ({ invite }) => { load(); const msg = await shareInvite(invite.token); if (msg) toast(msg) })
    .catch(e => toast(e.message))
  const reshare = token => shareInvite(token).then(msg => msg && toast(msg))
  const revoke = token => confirmSheet({
    title: t('Cancel this invite?'),
    message: t('The link stops working at once and its seat is freed. Anyone you already sent it to will need a new one.'),
    confirmText: t('Cancel invite'), danger: true,
    onConfirm: () => api('/api/trainer/invite/revoke', { method: 'POST', body: JSON.stringify({ token }) })
      .then(() => { toast(t('Invite cancelled')); load() }).catch(e => toast(e.message))
  })

  const clients = d ? [...d.clients].sort((a, b) => (RANK[a.status?.code] ?? 9) - (RANK[b.status?.code] ?? 9) || a.name.localeCompare(b.name)) : []
  const count = code => clients.filter(c => c.status?.code === code).length
  const unread = clients.reduce((n, c) => n + (c.unread || 0), 0)

  return <div>
    <div className="hdr">
      <LogoMark size={34} />
      <div style={{ flex: 1, marginLeft: 10 }}><h1 style={{ margin: 0 }}>{t('Your clients')}</h1>
        <div className="sub">{d ? t('{0} of {1} seats · {2} plan', d.seats.clients + d.seats.open, d.seats.limit, PLAN[d.seats.plan]) : t('Loading…')}</div></div>
      <div className="row" style={{ gap: 8 }}>
        <button className="iconbtn" onClick={load} aria-label={t('Refresh')}><Icon name="reset" /></button>
        <SignOutButton />
      </div>
    </div>

    {d && clients.length > 0 && <div className="tiles" style={{ marginBottom: 12 }}>
      <div className="tile"><div className="l">{t('Clients')}</div><div className="v">{clients.length}</div></div>
      <div className="tile"><div className="l">{t('On track')}</div><div className="v">{count('ok')}</div></div>
      <div className="tile"><div className="l">{t('Need a look')}</div><div className="v" style={{ color: count('inactive') + count('stalled') ? 'var(--orange)' : undefined }}>{count('inactive') + count('stalled')}</div></div>
      <div className="tile"><div className="l">{t('Unread messages')}</div><div className="v" style={{ color: unread ? 'var(--acc)' : undefined }}>{unread}</div></div>
    </div>}

    <div className="cols">
      <div>
        <h4 className="sec" style={{ marginTop: 0 }}>{t('Clients')}</h4>
        {!d ? <div className="muted small">{t('Loading…')}</div>
          : clients.length ? <div className="card" style={{ padding: '4px 14px' }}>
            {clients.map((c, n) => {
              const st = statusTag(c.status)
              return <button key={c.id} className="row between" onClick={() => nav('/trainer/c/' + c.id)}
                style={{ width: '100%', padding: '11px 0', borderTop: n ? '1px solid var(--sep)' : 'none', background: 'none', textAlign: 'left', color: 'inherit', gap: 10 }}>
                <div style={{ minWidth: 0 }}><div style={{ fontWeight: 600 }} className="capitalize">{c.name}</div>
                  <div className="dim" style={{ fontSize: '.75rem' }}>
                    {c.lastWorkout ? t('Last workout {0}', fmtDate(c.lastWorkout)) : t('No workouts yet')}
                    {c.weight != null && ' · ' + fmtNum(c.weight) + ' ' + c.unit}
                  </div></div>
                <div className="row" style={{ gap: 8, flexShrink: 0 }}>
                  {c.unread > 0 && <span className="tag acc nocap" aria-label={t('{0} unread messages', c.unread)}><Icon name="chat" /> {c.unread}</span>}
                  <span className={'tag nocap ' + st.cls}>{st.text}</span>
                  <Icon name="chevronRight" className="dim" />
                </div>
              </button>
            })}
          </div>
          : <div className="empty small">{t('No clients yet. Invite your first one with the button on the right.')}</div>}
      </div>

      <div>
        <h4 className="sec" style={{ marginTop: 0 }}>{t('Invite')}</h4>
        <div className="card">
          <Button variant="primary" icon="link" onClick={invite} disabled={!d || full}>{t('Invite a client')}</Button>
          <div className="dim small" style={{ marginTop: 8 }}>
            {full ? t('Your plan is full. Remove a client or cancel an open invite to free a seat.')
              : t('Send the link by WhatsApp or email. It works once and expires in {0} days.', d ? d.inviteDays : 14)}
          </div>
          {d?.invites.map(i => <div key={i.token} className="row between" style={{ padding: '9px 2px', borderTop: '1px solid var(--sep)', marginTop: 8 }}>
            <div><div className="small" style={{ fontWeight: 600 }}>{t('Waiting to be accepted')}</div>
              <div className="dim" style={{ fontSize: '.72rem' }}>{t('Created {0}', fmtDate(i.created.slice(0, 10)))}</div></div>
            <div className="row" style={{ gap: 6 }}>
              {/* 44px: these sit side by side on a phone, the one place a mis-tap cancels a link */}
              <button className="iconbtn" style={{ width: 44, height: 44, fontSize: 17 }} onClick={() => reshare(i.token)} aria-label={t('Share again')}><Icon name="link" /></button>
              <button className="iconbtn" style={{ width: 44, height: 44, fontSize: 17, color: 'var(--red)' }} onClick={() => revoke(i.token)} aria-label={t('Cancel invite')}><Icon name="trash" /></button>
            </div>
          </div>)}
        </div>
      </div>
    </div>
  </div>
}
