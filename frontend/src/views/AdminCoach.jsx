import { useEffect, useState } from 'react'
import { useUI } from '../store/useUI.js'
import { api } from '../lib/api.js'
import Icon from '../components/Icon.jsx'
import { Button, Switch, TextField } from '../components/ui.jsx'

/* The operator's side of the Coach: is it on, can it reach a model, and what has it been
   doing. Like the rest of the admin dashboard it is written in Spanish directly (Trainnery) —
   only the operator sees it.
 *
 * What it never shows: anybody's intake answers, payloads or proposals. An admin can enable
 * the feature and see that jobs ran; they cannot read what their users asked it. */

const rel = ts => {
  if (!ts) return 'nunca'
  const s = Math.max(0, (Date.now() - new Date(ts).getTime()) / 1000)
  if (s < 60) return 'ahora mismo'
  if (s < 3600) return 'hace ' + Math.floor(s / 60) + ' min'
  if (s < 86400) return 'hace ' + Math.floor(s / 3600) + ' h'
  return 'hace ' + Math.floor(s / 86400) + ' d'
}

export default function AdminCoach() {
  const toast = useUI(s => s.toast)
  const openSheet = useUI(s => s.openSheet)
  const [d, setD] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = () => api('/api/admin/coach').then(setD).catch(e => toast(e.message || 'No se pudo cargar'))
  useEffect(() => { load() }, [])

  const patch = async body => {
    setBusy(true)
    try { await api('/api/admin/coach/config', { method: 'POST', body: JSON.stringify(body) }); await load() }
    catch (e) { toast(e.message) }
    setBusy(false)
  }
  const test = async () => {
    setBusy(true)
    try {
      const r = await api('/api/admin/coach/test', { method: 'POST', body: '{}' })
      toast(r.ok ? 'Prueba del Coach superada ✅' : 'La prueba falló: ' + (r.error || 'desconocido'))
      await load()
    } catch (e) { toast(e.message) }
    setBusy(false)
  }
  const disconnect = async () => {
    setBusy(true)
    try { await api('/api/admin/coach/auth/disconnect', { method: 'POST', body: '{}' }); toast('Desconectado'); await load() }
    catch (e) { toast(e.message) }
    setBusy(false)
  }

  if (!d) return <div className="card"><div className="muted small">Cargando el estado del Coach…</div></div>

  if (d.disabledByEnv) return <div className="card">
    <h2 style={{ margin: '0 0 6px' }}>Coach IA</h2>
    <div className="muted small">Desactivado a la fuerza por <code>COACH_DISABLED</code> en el entorno. Quítalo para configurar el Coach aquí.</div>
  </div>

  const meta = d.providers.find(p => p.id === d.provider) || {}
  const authed = d.auth?.state === 'connected' || d.auth?.state === 'not-required'
  const live = d.enabled && d.runtime.ok && authed

  return <div className="card" style={{ borderColor: live ? 'var(--acc)' : undefined }}>
    <div className="row between" style={{ marginBottom: 8 }}>
      <h2 style={{ margin: 0 }}>Coach IA</h2>
      <Switch checked={!!d.enabled} disabled={busy} onChange={v => patch({ enabled: v })} />
    </div>

    {!d.enabled && <div className="muted small">Apagado. Los usuarios no ven el Coach en ninguna parte de la app.</div>}

    {d.enabled && <>
      <div className="tiles" style={{ textAlign: 'left', marginBottom: 10 }}>
        <div className="tile"><div className="l">Entorno</div>
          <div className="v" style={{ fontSize: '.9rem', color: d.runtime.ok ? 'var(--green)' : 'var(--red)' }}>{d.runtime.ok ? 'listo' : 'falta'}</div></div>
        <div className="tile"><div className="l">Credencial</div>
          <div className="v" style={{ fontSize: '.9rem', color: authed ? 'var(--green)' : 'var(--red)' }}>{authLabel(d.auth)}</div></div>
        <div className="tile"><div className="l">Trabajos hoy</div><div className="v" style={{ fontSize: '1.1rem' }}>{d.jobsToday}</div></div>
        <div className="tile"><div className="l">Última ejecución</div><div className="v" style={{ fontSize: '.85rem' }}>{rel(d.lastSuccess?.at)}</div></div>
      </div>

      {d.runtime.version && <div className="dim small" style={{ marginBottom: 8 }}>{meta.runtime || meta.label} · {d.runtime.version}</div>}
      {!d.runtime.ok && d.runtime.error && <div className="small" style={{ color: 'var(--red)', marginBottom: 8 }}>{d.runtime.error}</div>}

      {/* provider */}
      <h4 className="sec" style={{ marginTop: 4 }}>Proveedor</h4>
      <div className="row" style={{ flexWrap: 'wrap', gap: 7, marginBottom: 10 }}>
        {d.providers.map(p => <button key={p.id} className={'chip' + (p.id === d.provider ? ' on' : '')}
          disabled={busy} onClick={() => patch({ provider: p.id })}>{p.label}</button>)}
      </div>

      {/* credential */}
      {(meta.setupToken || meta.deviceLogin || meta.apiKey) && <>
        <h4 className="sec">Credencial</h4>
        {d.auth?.state === 'connected' ? <>
          <div className="small muted" style={{ marginBottom: 8 }}>
            Conectado{d.auth.account ? ' como ' + d.auth.account : ''} con {credentialLabel(d.auth.type)} · {rel(d.auth.connectedAt)}
          </div>
          <div className="row" style={{ gap: 8 }}>
            <Button size="sm" icon="check" disabled={busy} onClick={test}>Probar el Coach</Button>
            <Button size="sm" danger disabled={busy} onClick={disconnect}>Desconectar</Button>
          </div>
        </> : <>
          {d.auth?.state === 'expired' && <div className="small" style={{ color: 'var(--red)', marginBottom: 8 }}>La credencial guardada caducó: vuelve a conectar.</div>}
          {d.auth?.state === 'replace-required' && <div className="small" style={{ color: 'var(--red)', marginBottom: 8 }}>
            La credencial antigua de Claude ya no se usa. Agrega un token de configuración de Claude Code.
          </div>}
          {d.auth?.state === 'unreadable' && <div className="small" style={{ color: 'var(--red)', marginBottom: 8 }}>
            La credencial guardada no se puede descifrar; suele pasar cuando ./data se restauró sin su archivo <code>secret</code>. Vuelve a conectar.
          </div>}
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {meta.setupToken && <Button size="sm" variant="primary" icon="key" disabled={busy}
              onClick={() => openSheet(close => <SetupTokenSheet close={close} onDone={load} label={meta.label} />)}>Agregar token de la CLI</Button>}
            {meta.deviceLogin && <Button size="sm" variant="primary" icon="key" disabled={busy}
              onClick={() => openSheet(close => <ChatGPTLoginSheet close={close} onDone={load} label={meta.label} />)}>Entrar con ChatGPT</Button>}
            {meta.apiKey && !meta.setupToken && <Button size="sm" icon="lock" disabled={busy}
              onClick={() => openSheet(close => <ApiKeySheet close={close} onDone={load} label={meta.label} />)}>Usar una clave de API</Button>}
          </div>
        </>}
      </>}

      {/* limits */}
      <h4 className="sec">Límites</h4>
      <div className="row" style={{ gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
        <label className="small muted">Por usuario / día
          <input className="num" type="number" min="0" max="200" defaultValue={d.caps.perProfileDaily} style={{ width: 70, marginLeft: 8 }}
            onBlur={e => patch({ caps: { ...d.caps, perProfileDaily: +e.target.value } })} /></label>
        <label className="small muted">Toda la instancia / día
          <input className="num" type="number" min="0" max="5000" defaultValue={d.caps.instanceDaily} style={{ width: 70, marginLeft: 8 }}
            onBlur={e => patch({ caps: { ...d.caps, instanceDaily: +e.target.value } })} /></label>
      </div>
      <div className="dim small" style={{ marginBottom: 10 }}>0 = sin límite. Cada trabajo es una sesión en la cuenta de tu proveedor.</div>

      <h4 className="sec">Modelo</h4>
      <TextField defaultValue={d.model || ''} placeholder="(el predeterminado del proveedor)"
        onBlur={e => e.target.value !== (d.model || '') && patch({ model: e.target.value })} />

      {d.lastError && <>
        <h4 className="sec">Último fallo</h4>
        <div className="small" style={{ color: 'var(--red)' }}>{d.lastError.errorClass}{d.lastError.detail ? ' — ' + d.lastError.detail : ''}</div>
        <div className="dim" style={{ fontSize: '.72rem' }}>{rel(d.lastError.at)}</div>
      </>}

      {!!d.recent?.length && <>
        <h4 className="sec">Trabajos recientes</h4>
        {d.recent.slice(0, 8).map((e, i) => <div key={i} className="row between" style={{ padding: '5px 2px', borderBottom: '1px solid var(--sep)' }}>
          <span className="small">{e.kind}{e.trigger === 'scheduled' ? ' · programado' : ''}</span>
          <span className="dim" style={{ fontSize: '.72rem' }}>
            <span style={{ color: e.outcome === 'failed' ? 'var(--red)' : e.outcome === 'ready' ? 'var(--acc)' : undefined }}>{e.outcome}</span>
            {e.ms ? ' · ' + Math.round(e.ms / 1000) + 's' : ''} · {rel(e.at)}
          </span>
        </div>)}
      </>}
    </>}
  </div>
}

const authLabel = a => ({
  connected: 'conectada', 'not-required': 'no aplica', disconnected: 'necesaria', expired: 'caducada', unreadable: 'ilegible', 'replace-required': 'reemplazar'
}[a?.state] || '—')

const credentialLabel = type => ({
  'cli-token': 'token de configuración de Claude Code', 'chatgpt-cli': 'sesión de la CLI de ChatGPT', oauth: 'token antiguo', apikey: 'clave de API'
}[type] || 'credencial')

/* ------------------------------- setup token -------------------------------- */

function SetupTokenSheet({ close, onDone, label }) {
  const toast = useUI(s => s.toast)
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)

  const save = async () => {
    setBusy(true)
    try {
      const r = await api('/api/admin/coach/auth/setup-token', { method: 'POST', body: JSON.stringify({ token: token.trim() }) })
      setToken('')
      toast(r.test?.ok ? 'Conectado ✅' : 'Guardado, pero la prueba falló: ' + (r.test?.error || ''))
      close(); onDone()
    } catch (e) { toast(e.message); setBusy(false) }
  }

  return <>
    <h3>Conectar {label}</h3>
    <div className="muted small" style={{ lineHeight: 1.5, marginBottom: 12 }}>
      En un computador de confianza donde uses Claude Code, ejecuta <code>claude setup-token</code>, completa el inicio de sesión normal en el navegador y pega aquí el token que muestra. Esta app nunca abre ni maneja el flujo de autorización de Claude.
    </div>
    <TextField value={token} autoFocus type="password" placeholder="pega el token de configuración" onChange={e => setToken(e.target.value)} />
    <div style={{ height: 12 }} />
    <Button variant="primary" disabled={busy || !token.trim()} onClick={save}>Guardar y probar</Button>
    <div style={{ height: 8 }} />
  </>
}

/* ----------------------------- ChatGPT device login ----------------------------- */

function ChatGPTLoginSheet({ close, onDone, label }) {
  const toast = useUI(s => s.toast)
  const [login, setLogin] = useState(null)
  const [busy, setBusy] = useState(false)

  const poll = async () => {
    try {
      const next = await api('/api/admin/coach/auth/chatgpt/status')
      setLogin(next)
      if (next.state === 'connected') {
        toast('ChatGPT conectado ✅')
        close(); onDone()
      }
    } catch (e) { setLogin({ state: 'failed', error: e.message }) }
  }

  useEffect(() => {
    if (!['starting', 'pending'].includes(login?.state)) return undefined
    const timer = setInterval(poll, 1500)
    return () => clearInterval(timer)
  }, [login?.state])

  const start = async () => {
    setBusy(true)
    try {
      const next = await api('/api/admin/coach/auth/chatgpt/device', { method: 'POST', body: JSON.stringify({ replace: true }) })
      setLogin(next)
      if (next.state === 'connected') {
        toast('ChatGPT conectado ✅')
        close(); onDone()
      }
    } catch (e) { toast(e.message); setLogin({ state: 'failed', error: e.message }) }
    setBusy(false)
  }

  const waiting = ['starting', 'pending'].includes(login?.state)
  return <>
    <h3>Conectar {label}</h3>
    <div className="muted small" style={{ lineHeight: 1.5, marginBottom: 12 }}>
      Esto inicia el inicio de sesión oficial de ChatGPT por código de dispositivo de Codex dentro del entorno privado del Coach. En tu iPad u otro navegador de confianza, abre el enlace e ingresa el código de un solo uso que aparece. Trainnery no usa ni guarda ninguna clave de API.
    </div>
    {!waiting && login?.state !== 'connected' && <Button variant="primary" disabled={busy} onClick={start}>Iniciar sesión con el dispositivo</Button>}
    {waiting && <div className="small muted" style={{ marginBottom: 8 }}>Esperando el inicio de sesión de ChatGPT…</div>}
    {login?.instructions && <pre className="small" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', padding: 10, margin: '10px 0', border: '1px solid var(--sep)', borderRadius: 8, background: 'var(--bg)' }}>{login.instructions}</pre>}
    {login?.state === 'failed' && <div className="small" style={{ color: 'var(--red)', marginTop: 10 }}>{login.error || 'El inicio de sesión de ChatGPT no se completó. Inícialo de nuevo.'}</div>}
    <div className="dim small" style={{ marginTop: 12, lineHeight: 1.5 }}>
      Codex guarda su sesión renovable de la CLI en el volumen privado del Coach en este servidor. Se trata como una contraseña y nunca se muestra en esta app.
    </div>
    <div style={{ height: 8 }} />
  </>
}

function ApiKeySheet({ close, onDone, label }) {
  const toast = useUI(s => s.toast)
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)
  const save = async () => {
    setBusy(true)
    try {
      const r = await api('/api/admin/coach/auth/key', { method: 'POST', body: JSON.stringify({ key: key.trim() }) })
      toast(r.test?.ok ? 'Clave guardada ✅' : 'Guardada, pero la prueba falló: ' + (r.test?.error || ''))
      close(); onDone()
    } catch (e) { toast(e.message); setBusy(false) }
  }
  return <>
    <h3>Clave de API de {label}</h3>
    <div className="muted small" style={{ lineHeight: 1.5, marginBottom: 12 }}>
      Se guarda cifrada en este servidor y se pasa al entorno del proveedor solo mientras corre un trabajo. No se vuelve a mostrar y nunca sale del servidor.
    </div>
    <TextField value={key} autoFocus type="password" placeholder="sk-…" onChange={e => setKey(e.target.value)} />
    <div style={{ height: 12 }} />
    <Button variant="primary" disabled={busy || !key.trim()} onClick={save}>Guardar clave</Button>
    <div style={{ height: 8 }} />
  </>
}
