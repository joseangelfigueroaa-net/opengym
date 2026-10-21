import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { api } from '../lib/api.js'
import { fmtDate, fmtNum, fmtVol, fmtDur } from '../lib/format.js'
import { workoutVolume, setsDone } from '../lib/history.js'
import { confirmSheet } from '../sheets.jsx'
import Icon from '../components/Icon.jsx'
import { Button, Segmented } from '../components/ui.jsx'
import AdminCoach from './AdminCoach.jsx'

// Admin-only operator dashboard (owner passkey + admin flag; guarded again server-side).
// Trainnery: written in Spanish directly — only the operator sees it, so it stays out of the
// per-language string packs.

const rel = ts => {
  if (!ts) return 'nunca'
  const s = Math.max(0, (Date.now() - ts) / 1000)
  if (s < 60) return 'ahora mismo'
  if (s < 3600) return 'hace ' + Math.floor(s / 60) + ' min'
  if (s < 86400) return 'hace ' + Math.floor(s / 3600) + ' h'
  return 'hace ' + Math.floor(s / 86400) + ' d'
}
const dur = ms => { const m = Math.max(0, Math.floor(ms / 60000)); return m < 60 ? m + 'm' : Math.floor(m / 60) + 'h' + (m % 60) + 'm' }

function UserDetail({ id, onChanged, close }) {
  const [d, setD] = useState(null)
  const toast = useUI(s => s.toast)
  useEffect(() => { api('/api/admin/user?id=' + encodeURIComponent(id)).then(setD).catch(e => toast(e.message)) }, [id])
  if (!d) return <div className="muted small">Cargando…</div>
  const u = d.user
  const setDisabled = disabled => {
    api('/api/admin/user/disable', { method: 'POST', body: JSON.stringify({ id: u.id, disabled }) })
      .then(() => { toast(disabled ? 'Usuario desactivado' : 'Usuario activado'); onChanged(); close() })
      .catch(e => toast(e.message))
  }
  // Trainnery: makes the account a trainer on a plan, or takes the role away (links are kept).
  const setTrainer = plan => {
    api('/api/admin/user/trainer', { method: 'POST', body: JSON.stringify({ id: u.id, plan: plan === 'none' ? null : plan }) })
      .then(r => { setD({ ...d, user: { ...u, trainer: r.trainer ? r.trainer.plan : null } }); toast(r.trainer ? 'Plan de entrenador: ' + r.trainer.plan : 'Rol de entrenador retirado'); onChanged() })
      .catch(e => toast(e.message))
  }
  return <>
    <h3 className="capitalize">{u.name}</h3>
    <div className="row" style={{ gap: 6, flexWrap: 'wrap', margin: '8px 0 12px' }}>
      {u.admin && <span className="tag acc">admin</span>}
      {u.trainer && <span className="tag acc">entrenador · {u.trainer}</span>}
      {u.disabled && <span className="tag" style={{ color: 'var(--red)' }}>desactivado</span>}
      {u.invitedBy && <span className="tag">invitación {u.invitedBy}</span>}
      <span className="tag">alta {u.created ? fmtDate(u.created.slice(0, 10)) : '—'}</span>
    </div>
    <div className="tiles" style={{ textAlign: 'left' }}>
      <div className="tile"><div className="l">Entrenos</div><div className="v" style={{ fontSize: '1.1rem' }}>{d.workouts.length}</div></div>
      <div className="tile"><div className="l">Pesajes</div><div className="v" style={{ fontSize: '1.1rem' }}>{d.bodyweight.length}</div></div>
      <div className="tile"><div className="l">Rutinas</div><div className="v" style={{ fontSize: '1.1rem' }}>{d.routines.length}</div></div>
      <div className="tile"><div className="l">Última sincronización</div><div className="v" style={{ fontSize: '.95rem' }}>{rel(d.lastSync)}</div></div>
    </div>
    {!u.admin && <button className={'btn ' + (u.disabled ? 'primary' : 'danger')} style={{ margin: '12px 0 4px' }}
      onClick={() => u.disabled ? setDisabled(false)
        : confirmSheet({ title: '¿Desactivar a ' + u.name + '?', message: 'Se cierra su sesión en todos los dispositivos y no podrá sincronizar ni entrar hasta que se reactive.', confirmText: 'Desactivar', danger: true, onConfirm: () => setDisabled(true) })}>
      {u.disabled ? 'Activar cuenta' : 'Desactivar cuenta'}</button>}
    <h4 className="sec">Plan de entrenador</h4>
    <Segmented value={u.trainer || 'none'} onChange={setTrainer}
      options={[{ value: 'none', label: 'No es entrenador' }, { value: 'free', label: 'Free · 1' }, { value: 'silver', label: 'Silver · 5' }]} />
    {u.trainer && <div className="dim small" style={{ marginTop: 6 }}>{u.clients} cliente{u.clients === 1 ? '' : 's'} vinculado{u.clients === 1 ? '' : 's'}</div>}
    <h4 className="sec">Historial de entrenos</h4>
    {d.workouts.length ? <div className="list" style={{ gap: 0 }}>
      {d.workouts.slice(0, 60).map(w => <div key={w.id} className="row between" style={{ padding: '9px 2px', borderBottom: '1px solid var(--sep)' }}>
        <div><div className="small" style={{ fontWeight: 600 }}>{w.name}</div>
          <div className="dim" style={{ fontSize: '.72rem' }}>{fmtDate(w.d, true)} · {fmtDur((w.end || w.start) - w.start)} · {setsDone(w)} series{w.prs?.length ? ' · ' + w.prs.length + ' PR' : ''}</div></div>
        <span className="small muted">{fmtVol(w.vol ?? workoutVolume(w), d.unit)}</span>
      </div>)}
    </div> : <div className="empty small">Sin entrenos registrados.</div>}
  </>
}

function InvitesCard({ invites, reload }) {
  const toast = useUI(s => s.toast)
  const gen = () => api('/api/admin/invites/new', { method: 'POST', body: '{}' })
    .then(({ invite }) => { navigator.clipboard?.writeText(invite.code).catch(() => {}); toast('Código ' + invite.code + ' creado y copiado'); reload() })
    .catch(e => toast(e.message))
  const revoke = code => api('/api/admin/invites/revoke', { method: 'POST', body: JSON.stringify({ code }) })
    .then(() => { toast('Código revocado'); reload() }).catch(e => toast(e.message))
  const open = (invites || []).filter(i => !i.usedBy)
  const used = (invites || []).filter(i => i.usedBy)
  return <div className="card">
    <div className="row between"><h2 style={{ margin: 0 }}>Códigos de invitación</h2>
      <Button variant="primary" size="sm" onClick={gen} icon="plus">Generar</Button></div>
    <div className="small muted" style={{ margin: '6px 0 10px' }}>{open.length} sin usar · {used.length} canjeados</div>
    {open.map(i => <div key={i.code} className="row between" style={{ padding: '7px 2px', borderBottom: '1px solid var(--sep)' }}>
      <span style={{ fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace', fontWeight: 500, letterSpacing: '.06em' }}
        onClick={() => { navigator.clipboard?.writeText(i.code).catch(() => {}); toast('Copiado ' + i.code) }}>{i.code}</span>
      <button className="iconbtn" style={{ width: 32, height: 30, borderRadius: 8, fontSize: 15, color: 'var(--red)' }} onClick={() => revoke(i.code)} aria-label="Revocar"><Icon name="trash" /></button>
    </div>)}
    {used.map(i => <div key={i.code} className="row between dim" style={{ padding: '7px 2px', fontSize: '.8rem' }}>
      <span style={{ fontFamily: 'monospace' }}>{i.code}</span><span>→ {i.usedByName || 'usado'}</span>
    </div>)}
    {!open.length && !used.length && <div className="dim small">Aún no hay códigos: genera uno para invitar a alguien.</div>}
  </div>
}

export default function Admin() {
  const nav = useNavigate()
  const user = useStore(s => s.user)
  const toast = useUI(s => s.toast)
  const openSheet = useUI(s => s.openSheet)
  const [users, setUsers] = useState(null)
  const [invites, setInvites] = useState(null)
  const [inviteOnly, setInviteOnly] = useState(false)

  const loadUsers = () => api('/api/admin/users').then(d => { setUsers(d.users); setInviteOnly(d.invite_only) }).catch(e => toast(e.message || 'No se pudo cargar'))
  const loadInvites = () => api('/api/admin/invites').then(d => setInvites(d.invites)).catch(() => {})
  // poll every 15s so the "training now" section stays live without a manual refresh
  useEffect(() => { if (!user?.admin) return; loadUsers(); loadInvites(); const iv = setInterval(loadUsers, 15000); return () => clearInterval(iv) }, [])
  if (!user?.admin) return null

  const openUser = id => openSheet(close => <UserDetail id={id} onChanged={loadUsers} close={close} />)
  const liveUsers = (users || []).filter(u => u.live)
  const activeCount = (users || []).filter(u => u.lastSync && Date.now() - u.lastSync < 7 * 86400000).length
  const disabledCount = (users || []).filter(u => u.disabled).length

  return <div className="narrow">
    <div className="hdr">
      <button className="iconbtn" onClick={() => nav('/settings')} aria-label="Atrás"><Icon name="chevronLeft" /></button>
      <div style={{ flex: 1, marginLeft: 8 }}><h1 style={{ margin: 0 }}>Administración</h1>
        <div className="sub">{users ? users.length + ' usuarios · ' + activeCount + ' activos esta semana' : 'Cargando…'}</div></div>
      <button className="iconbtn" onClick={() => { loadUsers(); loadInvites() }} aria-label="Actualizar">↻</button>
    </div>

    <div className="tiles" style={{ marginBottom: 12 }}>
      <div className="tile"><div className="l">Usuarios</div><div className="v">{users ? users.length : '—'}</div></div>
      <div className="tile"><div className="l">Entrenando ahora</div><div className="v" style={{ color: liveUsers.length ? 'var(--acc)' : undefined }}>{users ? liveUsers.length : '—'}</div></div>
      <div className="tile"><div className="l">Activos 7 d</div><div className="v">{users ? activeCount : '—'}</div></div>
      <div className="tile"><div className="l">Desactivados</div><div className="v">{users ? disabledCount : '—'}</div></div>
    </div>

    {liveUsers.length > 0 && <div className="card" style={{ borderColor: 'var(--acc)' }}>
      <h2 className="row" style={{ margin: '0 0 8px', gap: 6 }}><Icon name="dot" style={{ fontSize: 10, color: 'var(--green)' }} />Entrenando ahora</h2>
      {liveUsers.map(u => <div key={u.id} className="row between" style={{ padding: '8px 2px', borderBottom: '1px solid var(--sep)' }} onClick={() => openUser(u.id)}>
        <div><div className="small" style={{ fontWeight: 600 }}>{u.name}</div>
          <div className="dim" style={{ fontSize: '.72rem' }}>{u.live.name} · ejercicio {u.live.exIdx}/{u.live.exTotal} · {u.live.setsDone}/{u.live.setsTotal} series</div></div>
        <span className="tag acc">{dur(Date.now() - u.live.startedAt)}</span>
      </div>)}
    </div>}

    <AdminCoach />

    <InvitesCard invites={invites} reload={loadInvites} />

    <h4 className="sec">Usuarios</h4>
    <div className="list">
      {(users || []).map(u => <div key={u.id} className="item" onClick={() => openUser(u.id)} style={u.disabled ? { opacity: .55 } : null}>
        <div className="grow"><div className="tt">{u.live && <Icon name="dot" style={{ fontSize: 9, color: 'var(--green)', display: 'inline-block', marginRight: 5 }} />}{u.name} {u.admin && <span className="tag acc" style={{ marginLeft: 4 }}>admin</span>}{u.disabled && <span className="tag" style={{ marginLeft: 4, color: 'var(--red)' }}>inactivo</span>}</div>
          <div className="ss">{u.live ? 'entrenando ahora · ' + u.live.name : u.workouts + ' entrenos' + (u.lastWorkout ? ' · último ' + fmtDate(u.lastWorkout) : '') + ' · sincronizado ' + rel(u.lastSync)}</div></div>
        {u.hasPush && <Icon name="bell" title="Notificaciones activadas" style={{ fontSize: 15, color: 'var(--label-3)' }} />}<Icon name="chevronRight" className="chev" />
      </div>)}
      {users && !users.length && <div className="empty">Aún no hay usuarios.</div>}
    </div>
  </div>
}
