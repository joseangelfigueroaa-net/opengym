import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { Button, SearchField, Segmented, Switch } from '../components/ui.jsx'

// A gym's panel: the trainers on staff and how loaded each one is, the members and who trains
// them, the members nobody trains yet, and the links that bring people in. The owner sees all of
// it; a trainer sees it if the gym gave them "members", and assigns if it gave them "assign".
// Activity and a progress signal in words, never body data: weights, measurements, meals and
// photos stay between a member and their trainer (api/trainer/gym.js, progressSignal).

const post = (url, body) => api(url, { method: 'POST', body: JSON.stringify(body || {}) })
const FILTERS = [['all', 'All'], ['unassigned', 'No trainer'], ['attention', 'Need a look']]
const needsLook = m => m.status?.code === 'inactive' || m.status?.code === 'stalled'
  || m.status?.progress?.trend === 'off_track' || m.status?.progress?.plan === 'behind'
// The progress signal as tags. Inactive and stalled already show as the status tag.
const TRENDS = { advancing: ['ok', 'Moving toward their goal'], off_track: ['warn', 'Moving away from their goal'] }
const PLANS = { on_plan: ['ok', 'Keeps to their plan'], behind: ['warn', 'Not keeping to their plan'] }
// in the list, only what needs a look; someone inactive is already flagged, so their plan isn't repeated
const progressTags = (p, all) => [p?.trend && TRENDS[p.trend], p?.plan && (all || (p.plan === 'behind' && p.trend !== 'inactive')) && PLANS[p.plan]].filter(Boolean)
// What each permission lets a person do, as the invite and the settings sheet say it.
const STAFF_PERMS = [
  ['members', 'See every member and their activity'],
  ['assign', 'Assign and move members between trainers'],
  ['content', 'Publish content for the whole gym']
]
const MEMBER_PERMS = [['content', 'See the gym’s content']]
const permText = (kind, perms) => {
  const list = (kind === 'trainer' ? STAFF_PERMS : MEMBER_PERMS).filter(([k]) => perms.includes(k)).map(([, l]) => t(l))
  return list.length ? list.join(' · ') : kind === 'trainer' ? t('Only their own clients') : t('No extra permissions')
}
const toggle = (list, k, on) => on ? [...new Set([...list, k])] : list.filter(x => x !== k)

function PermList({ kind, perms, onChange, disabled }) {
  return <div className="card" style={{ padding: '4px 14px' }}>
    {(kind === 'trainer' ? STAFF_PERMS : MEMBER_PERMS).map(([k, label], n) => <div key={k} className="row between" style={{ gap: 12, padding: '10px 0', borderTop: n ? '1px solid var(--sep)' : 'none' }}>
      <span className="small">{t(label)}</span>
      <Switch checked={perms.includes(k)} disabled={disabled} onChange={on => onChange(toggle(perms, k, on))} />
    </div>)}
  </div>
}

// The invite, set up before it is sent: who it is for and what they may do once they join.
function InviteSheet({ kind: start, d, close, onCreate }) {
  const [kind, setKind] = useState(start)
  const [perms, setPerms] = useState(start === 'trainer' ? [] : ['content'])
  const [trainer, setTrainer] = useState('')
  const pick = k => { setKind(k); setPerms(k === 'trainer' ? [] : ['content']) }
  return <>
    <h3>{t('New invite')}</h3>
    <Segmented options={[{ value: 'trainer', label: t('Trainer') }, { value: 'member', label: t('Member') }]} value={kind} onChange={pick} />
    <div className="dim small" style={{ margin: '8px 0 12px' }}>
      {kind === 'trainer' ? t('A personal link that works once and expires in 14 days.') : t('A link for members, valid for 90 days. Several people can use it.')}
    </div>
    <h4 className="sec" style={{ marginTop: 0 }}>{t('Permissions')}</h4>
    <PermList kind={kind} perms={perms} onChange={setPerms} />
    {kind === 'trainer' && <div className="dim small" style={{ marginTop: 6 }}>{t('Every trainer sees and trains the members assigned to them. You can change permissions later.')}</div>}
    {kind === 'member' && d.trainers.length > 0 && <>
      <h4 className="sec">{t('Trainer on joining')}</h4>
      <div className="chips" style={{ flexWrap: 'wrap' }}>
        {[{ id: '', name: t('The gym assigns later') }, ...d.trainers].map(x => <button key={x.id} className={'chip nocap' + (trainer === x.id ? ' on' : '')} aria-pressed={trainer === x.id} onClick={() => setTrainer(x.id)}>{x.name}</button>)}
      </div>
    </>}
    <Button variant="primary" icon="link" style={{ marginTop: 16 }} onClick={() => onCreate({ kind, perms, trainer: trainer || undefined }, close)}>{t('Create and share the link')}</Button>
  </>
}

// One trainer, for the owner: their shift and their permissions, and the way out of the gym.
function TrainerSheet({ x, d, close, apply, onRemove, navTo }) {
  const [perms, setPerms] = useState(x.perms || [])
  const [shift, setShift] = useState(x.shift || '')
  const isOwner = x.id === d.me?.ownerId
  return <>
    <h3 className="capitalize">{x.name}</h3>
    <div className="muted small" style={{ marginBottom: 12 }}>{t('{0} of {1} gym members', x.clients, x.limit)}</div>
    {!isOwner && <Button icon="chat" style={{ marginBottom: 12 }} onClick={() => { close(); navTo('/gym/chat/' + x.id) }}>{x.unread ? t('Messages ({0} new)', x.unread) : t('Send a message')}</Button>}
    <div className="small muted" style={{ marginBottom: 6 }}>{t('Shift')}</div>
    <Segmented options={SHIFTS.map(([value, label]) => ({ value, label: t(label) }))} value={shift}
      onChange={v => { setShift(v); apply(post('/api/gym/shift', { kind: 'trainer', id: x.id, shift: v })) }} />
    <h4 className="sec">{t('Permissions')}</h4>
    {isOwner ? <div className="dim small">{t('You own the gym: you can do everything.')}</div>
      : <PermList kind="trainer" perms={perms} onChange={p => { setPerms(p); apply(post('/api/gym/perms', { kind: 'trainer', id: x.id, perms: p })) }} />}
    <Button variant="ghost" style={{ marginTop: 14, color: 'var(--red)' }} onClick={() => { close(); onRemove(x) }}>{t('Remove from the gym')}</Button>
  </>
}

function LoadBar({ n, of }) {
  const pct = of ? Math.min(100, Math.round(n / of * 100)) : 0
  const color = pct >= 90 ? 'var(--red)' : pct >= 70 ? 'var(--orange)' : 'var(--acc)'
  return <div aria-hidden="true" style={{ height: 6, borderRadius: 3, background: 'var(--surface-3)', overflow: 'hidden', marginTop: 6 }}>
    <i style={{ display: 'block', height: '100%', width: pct + '%', background: color, borderRadius: 3 }} />
  </div>
}

// Who should train this member: every trainer with their load, the suggested one first.
function AssignSheet({ m, d, close, apply, navTo }) {
  const [shift, setShift] = useState(m.shift || '')
  const [perms, setPerms] = useState(m.perms || [])
  const canAssign = d.me?.owner || (d.me?.perms || []).includes('assign')
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
      {' · '}{m.planned ? t('Has workouts from their trainer') : t('No workouts assigned')}
    </div>
    {progressTags(m.status?.progress, true).length > 0 && <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
      {progressTags(m.status?.progress, true).map(([cls, label]) => <span key={label} className={'tag nocap ' + cls}>{t(label)}</span>)}
    </div>}
    {d.me?.owner && <Button icon="chat" style={{ marginBottom: 12 }} onClick={() => { close(); navTo('/gym/chat/' + m.id) }}>{m.unread ? t('Messages ({0} new)', m.unread) : t('Send a message')}</Button>}
    {d.me?.owner && <>
      <h4 className="sec" style={{ marginTop: 0 }}>{t('Permissions')}</h4>
      <PermList kind="member" perms={perms} onChange={p => { setPerms(p); apply(post('/api/gym/perms', { kind: 'member', id: m.id, perms: p })) }} />
    </>}
    {!canAssign ? null : <>
    <div className="small muted" style={{ margin: '12px 0 6px' }}>{t('Shift')}</div>
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
    </>}
  </>
}

export default function Gym() {
  const nav = useNavigate()
  const user = useStore(s => s.user)
  const toast = useUI(s => s.toast)
  const [d, setD] = useState(null)
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')
  const g = user?.gym
  const allowed = g?.role === 'owner' || (g?.role === 'trainer' && (g.perms || []).includes('members'))

  const load = () => api('/api/gym').then(setD).catch(e => toast(e.message))
  useEffect(() => { if (allowed) load() }, [allowed])
  if (!allowed) return null

  // Every change answers with the fresh overview, so the screen never shows a stale load.
  const apply = (p, msg, after) => p.then(v => { if (v?.members) setD(v); else load(); if (msg) toast(msg); after?.() }).catch(e => toast(e.message))
  const openMember = m => useUI.getState().openSheet(close => <AssignSheet m={m} d={d} close={close} apply={apply} navTo={nav} />)
  const create = (opts, close) => post('/api/gym/invite', opts)
    .then(async ({ invite }) => { close(); load(); const msg = await shareGymLink(invite.token, invite.kind, d.gym.name); if (msg) toast(msg) })
    .catch(e => toast(e.message))
  const invite = kind => useUI.getState().openSheet(close => <InviteSheet kind={kind} d={d} close={close} onCreate={create} />)
  const openTrainer = x => useUI.getState().openSheet(close => <TrainerSheet x={x} d={{ ...d, me: { ...d.me, ownerId: user.id } }} close={close} apply={apply} onRemove={removeTrainer} navTo={nav} />)
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
  const isOwner = !!d.me?.owner
  const canAssign = isOwner || (d.me?.perms || []).includes('assign')
  const canPublish = isOwner || (d.me?.perms || []).includes('content')
  const staffInvites = d.invites.filter(i => i.kind === 'trainer')
  const trainerName = id => d.trainers.find(x => x.id === id)?.name

  return <div>
    <div className="hdr">
      <LogoMark size={34} />
      <div style={{ flex: 1, marginLeft: 10, minWidth: 0 }}><h1 style={{ margin: 0 }} className="capitalize">{d.gym.name}</h1>
        <div className="sub">{t('{0} plan · {1} of {2} members · {3} of {4} trainers', t(GYM_PLAN[d.gym.plan] || d.gym.plan), d.members.length, d.gym.limits.members, d.trainers.length, d.gym.limits.trainers)}</div></div>
      <div className="row" style={{ gap: 8 }}>
        {canPublish && <button className="iconbtn" onClick={() => nav('/trainer/content')} aria-label={t('Gym content')}><Icon name="library" /></button>}
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

    {canAssign && unassigned.length > 0 && d.trainers.length > 0 && <div className="card row between" style={{ gap: 12, marginBottom: 12, borderColor: 'var(--acc)' }}>
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
        {!d.members.length ? <div className="empty small">{t('No members yet. Invite them with a member link, or your trainers invite their clients for the gym.')}</div>
          : !shown.length ? <div className="empty small">{t('Nobody here.')}</div>
          : <div className="card" style={{ padding: '4px 14px' }}>
            {shown.map((m, n) => {
              const st = statusTag(m.status)
              const prog = progressTags(m.status?.progress)
              // "on track" says nothing a trend tag doesn't: moving either way means they're active
              const showSt = !(m.status?.code === 'ok' && TRENDS[m.status?.progress?.trend])
              return <button key={m.id} className="row between" onClick={() => openMember(m)}
                style={{ width: '100%', padding: '11px 0', borderTop: n ? '1px solid var(--sep)' : 'none', background: 'none', textAlign: 'left', color: 'inherit', gap: 10 }}>
                <div style={{ minWidth: 0, flex: '1 1 40%' }}><div style={{ fontWeight: 600 }} className="capitalize">{m.name}</div>
                  <div className="dim" style={{ fontSize: '.75rem' }}>
                    {m.trainerName ? t('Trainer: {0}', m.trainerName) : m.outside ? t('Outside trainer') : <span style={{ color: 'var(--orange)' }}>{t('No trainer')}</span>}
                    {' · ' + shiftLabel(m.shift)}
                  </div></div>
                <div className="row" style={{ gap: 6, flex: '0 1 auto', flexWrap: 'wrap', justifyContent: 'flex-end', minWidth: 0 }}>
                  {m.unread > 0 && <span className="tag acc nocap" aria-label={t('{0} unread messages', m.unread)}><Icon name="chat" /> {m.unread}</span>}
                  {m.trainerId && !m.planned && <span className="tag warn nocap">{t('No workouts')}</span>}
                  {prog.map(([cls, label]) => <span key={label} className={'tag nocap ' + cls}>{t(label)}</span>)}
                  {showSt && <span className={'tag nocap ' + st.cls}>{st.text}</span>}
                </div>
                <Icon name="chevronRight" className="dim" style={{ flexShrink: 0 }} />
              </button>
            })}
          </div>}
      </div>

      <div>
        <h4 className="sec" style={{ marginTop: 0 }}>{t('Trainers')}</h4>
        <div className="card" style={{ padding: d.trainers.length ? '4px 14px' : undefined }}>
          {!d.trainers.length && <div className="dim small">{t('No trainers yet. Invite them with a link: each one signs in with their own profile.')}</div>}
          {d.trainers.map((x, n) => <button key={x.id} disabled={!isOwner} onClick={() => openTrainer(x)}
            style={{ display: 'block', width: '100%', padding: '11px 0', borderTop: n ? '1px solid var(--sep)' : 'none', background: 'none', textAlign: 'left', color: 'inherit' }}>
            <div className="row between" style={{ gap: 8 }}>
              <div style={{ minWidth: 0 }}><div style={{ fontWeight: 600 }} className="capitalize">{x.name}</div>
                <div className="dim" style={{ fontSize: '.75rem' }}>{t('{0} of {1} gym members', x.clients, x.limit)} · {shiftLabel(x.shift)}</div>
                <div className="dim" style={{ fontSize: '.72rem' }}>{x.id === user.id && isOwner ? t('Owner') : permText('trainer', x.perms || [])}</div></div>
              {isOwner && <Icon name="chevronRight" className="dim" />}
            </div>
            <LoadBar n={x.clients} of={x.limit} />
          </button>)}
        </div>

        {isOwner && !d.trainers.some(x => x.id === user.id) && <Button icon="person" style={{ marginTop: 10 }} disabled={d.trainers.length >= d.gym.limits.trainers}
          onClick={() => apply(post('/api/gym/staff/self'), t('You now train at {0}', d.gym.name))}>{t('Train here too')}</Button>}

        {isOwner && <>
        <h4 className="sec">{t('Invite')}</h4>
        <div className="card">
          <div className="row" style={{ gap: 8 }}>
            <Button variant="primary" icon="link" onClick={() => invite('trainer')} disabled={d.trainers.length + staffInvites.length >= d.gym.limits.trainers}>{t('Invite a trainer')}</Button>
            <Button icon="person" onClick={() => invite('member')}>{t('Invite members')}</Button>
          </div>
          <div className="dim small" style={{ marginTop: 8 }}>{t('Choose what they may do before you send the link.')}</div>
          {d.invites.map(i => <div key={i.token} className="row between" style={{ padding: '9px 2px', borderTop: '1px solid var(--sep)', marginTop: 8, gap: 8 }}>
            <div style={{ minWidth: 0 }}><div className="small" style={{ fontWeight: 600 }}>{i.kind === 'trainer' ? t('Trainer invite waiting') : t('Member link')}</div>
              <div className="dim" style={{ fontSize: '.72rem' }}>{permText(i.kind, i.perms || [])}{i.trainerId && trainerName(i.trainerId) ? ' · ' + t('Goes to {0}', trainerName(i.trainerId)) : ''}</div>
              <div className="dim" style={{ fontSize: '.72rem' }}>{t('Valid until {0}', fmtDate(i.expires.slice(0, 10)))}</div></div>
            <div className="row" style={{ gap: 6 }}>
              <button className="iconbtn" style={{ width: 44, height: 44 }} onClick={() => reshare(i)} aria-label={t('Share again')}><Icon name="link" /></button>
              <button className="iconbtn" style={{ width: 44, height: 44, color: 'var(--red)' }} onClick={() => revoke(i)} aria-label={t('Cancel invite')}><Icon name="trash" /></button>
            </div>
          </div>)}
        </div>
        </>}
      </div>
    </div>
  </div>
}
