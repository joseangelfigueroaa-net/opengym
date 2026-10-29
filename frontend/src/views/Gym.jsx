import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { api } from '../lib/api.js'
import { fmtDate } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import { statusTag } from '../lib/trainer.js'
import { SHIFTS, shiftLabel, shareGymLink, GYM_PLAN } from '../lib/gym.js'
import { confirmSheet } from '../sheets.jsx'
import SignOutButton from '../components/SignOutButton.jsx'
import Icon from '../components/Icon.jsx'
import { LogoMark } from '../components/Logo.jsx'
import { Button, SearchField, Segmented } from '../components/ui.jsx'

// A gym owner's panel: the trainers on staff and how loaded each one is, the members and who
// trains them, the members nobody trains yet, and the links that bring people in. The owner sees
// activity, never body data: that stays between a member and their trainer (api/trainer/gym.js).

const post = (url, body) => api(url, { method: 'POST', body: JSON.stringify(body || {}) })
const FILTERS = [['all', 'All'], ['unassigned', 'No trainer'], ['attention', 'Need a look']]
const needsLook = m => m.status?.code === 'inactive' || m.status?.code === 'stalled'

function LoadBar({ n, of }) {
  const pct = of ? Math.min(100, Math.round(n / of * 100)) : 0
  const color = pct >= 90 ? 'var(--red)' : pct >= 70 ? 'var(--orange)' : 'var(--acc)'
  return <div aria-hidden="true" style={{ height: 6, borderRadius: 3, background: 'var(--surface-3)', overflow: 'hidden', marginTop: 6 }}>
    <i style={{ display: 'block', height: '100%', width: pct + '%', background: color, borderRadius: 3 }} />
  </div>
}

// Who should train this member: every trainer with their load, the suggested one first.
function AssignSheet({ m, d, close, apply }) {
  const [shift, setShift] = useState(m.shift || '')
  const open = d.trainers.filter(x => !x.disabled && x.clients < x.limit)
  const inShift = m.shift ? open.filter(x => !x.shift || x.shift === m.shift) : open
  const pool = (inShift.length ? inShift : open).slice()
    .sort((a, b) => a.clients / a.limit - b.clients / b.limit || a.clients - b.clients || a.name.localeCompare(b.name))
  const best = pool[0]?.id
  const rows = [...d.trainers].sort((a, b) => (b.id === best) - (a.id === best) || a.name.localeCompare(b.name))
  return <>
    <h3 className="capitalize">{m.name}</h3>
    <div className="muted small" style={{ marginBottom: 12 }}>
      {t('Trains: {0}', shiftLabel(shift))}{m.trainerName ? ' · ' + t('Trainer: {0}', m.trainerName) : ''}
    </div>
    <div className="small muted" style={{ marginBottom: 6 }}>{t('Shift')}</div>
    <Segmented options={SHIFTS.map(([value, label]) => ({ value, label: t(label) }))} value={shift}
      onChange={v => { setShift(v); apply(post('/api/gym/shift', { kind: 'member', id: m.id, shift: v }), null) }} />
    <h4 className="sec">{t('Assign a trainer')}</h4>
    {m.outside && <div className="card small warn" style={{ marginBottom: 10 }}>{t('This member has a personal trainer from outside the gym. The gym can’t change that.')}</div>}
    {!d.trainers.length ? <div className="empty small">{t('Invite your first trainer to start assigning members.')}</div>
      : <div className="card" style={{ padding: '4px 14px' }}>
        {rows.map((x, n) => {
          const full = x.clients >= x.limit
          const cur = x.id === m.trainerId
          return <button key={x.id} disabled={full && !cur || m.outside} onClick={() => cur ? close() : apply(post('/api/gym/assign', { member: m.id, trainer: x.id }), t('{0} now trains {1}', x.name, m.name), close)}
            style={{ width: '100%', padding: '11px 0', borderTop: n ? '1px solid var(--sep)' : 'none', background: 'none', textAlign: 'left', color: 'inherit', opacity: full && !cur ? .5 : 1 }}>
            <div className="row between" style={{ gap: 8 }}>
              <div style={{ fontWeight: 600 }} className="capitalize">{x.name}</div>
              <div className="row" style={{ gap: 6 }}>
                {x.id === best && !cur && <span className="tag acc nocap">{t('Suggested')}</span>}
                {cur && <span className="tag ok nocap">{t('Current')}</span>}
                <span className="dim small">{shiftLabel(x.shift)}</span>
              </div>
            </div>
            <div className="dim" style={{ fontSize: '.75rem', marginTop: 2 }}>{full ? t('Full · {0} of {1} clients', x.clients, x.limit) : t('{0} of {1} clients', x.clients, x.limit)}</div>
            <LoadBar n={x.clients} of={x.limit} />
          </button>
        })}
      </div>}
    {m.trainerId && <Button variant="ghost" className="dim" style={{ marginTop: 12 }}
      onClick={() => apply(post('/api/gym/unassign', { member: m.id }), t('{0} has no trainer now', m.name), close)}>{t('Remove trainer')}</Button>}
  </>
}

export default function Gym() {
  const user = useStore(s => s.user)
  const toast = useUI(s => s.toast)
  const [d, setD] = useState(null)
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')
  const owner = user?.gym?.role === 'owner'

  const load = () => api('/api/gym').then(setD).catch(e => toast(e.message))
  useEffect(() => { if (owner) load() }, [owner])
  if (!owner) return null

  // Every change answers with the fresh overview, so the screen never shows a stale load.
  const apply = (p, msg, after) => p.then(v => { if (v?.members) setD(v); else load(); if (msg) toast(msg); after?.() }).catch(e => toast(e.message))
  const openMember = m => useUI.getState().openSheet(close => <AssignSheet m={m} d={d} close={close} apply={apply} />)
  const invite = kind => post('/api/gym/invite', { kind })
    .then(async ({ invite }) => { load(); const msg = await shareGymLink(invite.token, kind, d.gym.name); if (msg) toast(msg) })
    .catch(e => toast(e.message))
  const reshare = i => shareGymLink(i.token, i.kind, d.gym.name).then(msg => msg && toast(msg))
  const revoke = i => confirmSheet({
    title: i.kind === 'member' ? t('Cancel the member code?') : t('Cancel this invite?'),
    message: t('The link stops working at once. Anyone you already sent it to will need a new one.'),
    confirmText: t('Cancel invite'), danger: true,
    onConfirm: () => apply(post('/api/gym/invite/revoke', { token: i.token }), t('Invite cancelled'))
  })
  const removeTrainer = x => confirmSheet({
    title: t('Remove {0} from the gym?', x.name),
    message: t('Their gym members go back to the list without a trainer, so you can reassign them. Clients they brought themselves stay with them.'),
    confirmText: t('Remove'), danger: true,
    onConfirm: () => apply(post('/api/gym/staff/remove', { id: x.id }), t('{0} no longer works at the gym', x.name))
  })
  const cycleShift = x => {
    const order = SHIFTS.map(s => s[0])
    const next = order[(order.indexOf(x.shift || '') + 1) % order.length]
    apply(post('/api/gym/shift', { kind: 'trainer', id: x.id, shift: next }))
  }
  const autoAssign = () => post('/api/gym/auto-assign').then(v => {
    setD(v)
    const { assigned, left } = v.result
    toast(left ? t('{0} assigned · {1} without room', assigned, left) : assigned === 1 ? t('1 member assigned') : t('{0} members assigned', assigned))
  }).catch(e => toast(e.message))

  if (!d) return <div><div className="hdr"><LogoMark size={34} /><div style={{ flex: 1, marginLeft: 10 }}><h1 style={{ margin: 0 }}>{user.gym.name}</h1><div className="sub">{t('Loading…')}</div></div><SignOutButton /></div></div>

  const unassigned = d.members.filter(m => !m.trainerId && !m.outside)
  const attention = d.members.filter(needsLook)
  const ql = q.trim().toLowerCase()
  const shown = d.members
    .filter(m => filter === 'all' || (filter === 'unassigned' ? !m.trainerId && !m.outside : needsLook(m)))
    .filter(m => !ql || m.name.toLowerCase().includes(ql) || (m.trainerName || '').toLowerCase().includes(ql))
    // members nobody trains first, then those who need a look, then by name
    .sort((a, b) => (!b.trainerId && !b.outside) - (!a.trainerId && !a.outside) || needsLook(b) - needsLook(a) || a.name.localeCompare(b.name))
  const memberCode = d.invites.find(i => i.kind === 'member')
  const staffInvites = d.invites.filter(i => i.kind === 'trainer')

  return <div>
    <div className="hdr">
      <LogoMark size={34} />
      <div style={{ flex: 1, marginLeft: 10, minWidth: 0 }}><h1 style={{ margin: 0 }} className="capitalize">{d.gym.name}</h1>
        <div className="sub">{t('{0} plan · {1} of {2} members · {3} of {4} trainers', t(GYM_PLAN[d.gym.plan] || d.gym.plan), d.members.length, d.gym.limits.members, d.trainers.length, d.gym.limits.trainers)}</div></div>
      <div className="row" style={{ gap: 8 }}>
        <button className="iconbtn" onClick={load} aria-label={t('Refresh')}><Icon name="reset" /></button>
        <SignOutButton />
      </div>
    </div>

    <div className="tiles" style={{ marginBottom: 12 }}>
      <div className="tile"><div className="l">{t('Members')}</div><div className="v">{d.members.length}</div></div>
      <div className="tile"><div className="l">{t('Trainers')}</div><div className="v">{d.trainers.length}</div></div>
      <button className="tile" style={{ textAlign: 'left' }} onClick={() => setFilter('unassigned')}><div className="l">{t('No trainer')}</div><div className="v" style={{ color: unassigned.length ? 'var(--orange)' : undefined }}>{unassigned.length}</div></button>
      <button className="tile" style={{ textAlign: 'left' }} onClick={() => setFilter('attention')}><div className="l">{t('Need a look')}</div><div className="v" style={{ color: attention.length ? 'var(--orange)' : undefined }}>{attention.length}</div></button>
    </div>

    {unassigned.length > 0 && d.trainers.length > 0 && <div className="card row between" style={{ gap: 12, marginBottom: 12, borderColor: 'var(--acc)' }}>
      <div className="small" style={{ minWidth: 0 }}><b>{unassigned.length === 1 ? t('1 member without a trainer') : t('{0} members without a trainer', unassigned.length)}</b>
        <div className="dim">{t('Spread them over the trainers with the most room, matching shifts first.')}</div></div>
      <Button variant="primary" icon="shuffle" onClick={autoAssign} style={{ width: 'auto', flexShrink: 0 }}>{t('Assign')}</Button>
    </div>}

    <div className="cols">
      <div>
        <h4 className="sec" style={{ marginTop: 0 }}>{t('Members')}</h4>
        <SearchField value={q} onChange={e => setQ(e.target.value)} onClear={() => setQ('')} placeholder={t('Search members or trainers')} aria-label={t('Search members or trainers')} />
        <div className="chips" style={{ margin: '10px 0' }}>
          {FILTERS.map(([v, label]) => <button key={v} className={'chip nocap' + (filter === v ? ' on' : '')} aria-pressed={filter === v} onClick={() => setFilter(v)}>{t(label)}</button>)}
        </div>
        {!d.members.length ? <div className="empty small">{t('No members yet. Share the member code below: print it at the front desk or send it by WhatsApp.')}</div>
          : !shown.length ? <div className="empty small">{t('Nobody here.')}</div>
          : <div className="card" style={{ padding: '4px 14px' }}>
            {shown.map((m, n) => {
              const st = statusTag(m.status)
              return <button key={m.id} className="row between" onClick={() => openMember(m)}
                style={{ width: '100%', padding: '11px 0', borderTop: n ? '1px solid var(--sep)' : 'none', background: 'none', textAlign: 'left', color: 'inherit', gap: 10 }}>
                <div style={{ minWidth: 0 }}><div style={{ fontWeight: 600 }} className="capitalize">{m.name}</div>
                  <div className="dim" style={{ fontSize: '.75rem' }}>
                    {m.trainerName ? t('Trainer: {0}', m.trainerName) : m.outside ? t('Outside trainer') : <span style={{ color: 'var(--orange)' }}>{t('No trainer')}</span>}
                    {' · ' + shiftLabel(m.shift)}
                  </div></div>
                <div className="row" style={{ gap: 8, flexShrink: 0 }}>
                  <span className={'tag nocap ' + st.cls}>{st.text}</span>
                  <Icon name="chevronRight" className="dim" />
                </div>
              </button>
            })}
          </div>}
      </div>

      <div>
        <h4 className="sec" style={{ marginTop: 0 }}>{t('Trainers')}</h4>
        <div className="card" style={{ padding: d.trainers.length ? '4px 14px' : undefined }}>
          {!d.trainers.length && <div className="dim small">{t('No trainers yet. Invite them with a link: each one signs in with their own profile.')}</div>}
          {d.trainers.map((x, n) => <div key={x.id} style={{ padding: '11px 0', borderTop: n ? '1px solid var(--sep)' : 'none' }}>
            <div className="row between" style={{ gap: 8 }}>
              <div style={{ minWidth: 0 }}><div style={{ fontWeight: 600 }} className="capitalize">{x.name}</div>
                <div className="dim" style={{ fontSize: '.75rem' }}>{t('{0} of {1} clients · {2} from the gym', x.clients, x.limit, x.members)}</div></div>
              <div className="row" style={{ gap: 6, flexShrink: 0 }}>
                <button className="chip nocap" onClick={() => cycleShift(x)} aria-label={t('Change shift')}>{shiftLabel(x.shift)}</button>
                <button className="iconbtn" style={{ width: 44, height: 44, color: 'var(--red)' }} onClick={() => removeTrainer(x)} aria-label={t('Remove {0} from the gym?', x.name)}><Icon name="trash" /></button>
              </div>
            </div>
            <LoadBar n={x.clients} of={x.limit} />
          </div>)}
        </div>

        <h4 className="sec">{t('Invite')}</h4>
        <div className="card">
          <Button variant="primary" icon="link" onClick={() => invite('trainer')} disabled={d.trainers.length + staffInvites.length >= d.gym.limits.trainers}>{t('Invite a trainer')}</Button>
          <div className="dim small" style={{ marginTop: 8 }}>{t('A personal link that works once and expires in 14 days.')}</div>
          {staffInvites.map(i => <div key={i.token} className="row between" style={{ padding: '9px 2px', borderTop: '1px solid var(--sep)', marginTop: 8 }}>
            <div><div className="small" style={{ fontWeight: 600 }}>{t('Trainer invite waiting')}</div>
              <div className="dim" style={{ fontSize: '.72rem' }}>{t('Created {0}', fmtDate(i.created.slice(0, 10)))}</div></div>
            <div className="row" style={{ gap: 6 }}>
              <button className="iconbtn" style={{ width: 44, height: 44 }} onClick={() => reshare(i)} aria-label={t('Share again')}><Icon name="link" /></button>
              <button className="iconbtn" style={{ width: 44, height: 44, color: 'var(--red)' }} onClick={() => revoke(i)} aria-label={t('Cancel invite')}><Icon name="trash" /></button>
            </div>
          </div>)}
          <div style={{ height: 14 }} />
          <Button icon="person" onClick={() => memberCode ? reshare(memberCode) : invite('member')}>{memberCode ? t('Share the member code') : t('Create the member code')}</Button>
          <div className="dim small" style={{ marginTop: 8 }}>
            {memberCode ? t('One link for all your members, valid until {0}. Making a new one cancels this one.', fmtDate(memberCode.expires.slice(0, 10)))
              : t('One link for all your members: print it at the front desk or send it by WhatsApp.')}
          </div>
          {memberCode && <div className="row" style={{ gap: 8, marginTop: 8 }}>
            <Button variant="ghost" className="dim" onClick={() => invite('member')}>{t('New code')}</Button>
            <Button variant="ghost" style={{ color: 'var(--red)' }} onClick={() => revoke(memberCode)}>{t('Cancel code')}</Button>
          </div>}
        </div>
      </div>
    </div>
  </div>
}
