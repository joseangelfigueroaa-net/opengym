import { useEffect, useState } from 'react'
import { useUI } from '../store/useUI.js'
import { api } from '../lib/api.js'
import { t } from '../lib/i18n.js'
import { fmtDate, todayISO } from '../lib/format.js'
import Icon from './Icon.jsx'
import { Button, TextArea } from './ui.jsx'

// Body photos over time. The client adds and removes their own (`canUpload`); the trainer they are
// linked to sees the same gallery read-only. `owner` is whose photos these are (default: the viewer).
const MAX_BYTES = 3.5 * 1024 * 1024
const photoUrl = (owner, id) => '/api/photos/file?' + (owner ? 'owner=' + encodeURIComponent(owner) + '&' : '') + 'id=' + encodeURIComponent(id)

export default function ProgressPhotos({ owner, canUpload = false, canDelete = false }) {
  const toast = useUI(s => s.toast)
  const [photos, setPhotos] = useState(null)
  const [d, setD] = useState(todayISO())
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const load = () => api('/api/photos' + (owner ? '?owner=' + encodeURIComponent(owner) : ''))
    .then(r => setPhotos(r.photos)).catch(e => { setPhotos([]); toast(e.message) })
  useEffect(() => { load() }, [owner])

  const upload = async e => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (f.size > MAX_BYTES) { toast(t('Photos are limited to 3.5 MB')); return }
    setBusy(true)
    try {
      const data = await new Promise((resolve, reject) => {
        const r = new FileReader()
        r.onload = () => resolve(String(r.result).split(',')[1])
        r.onerror = () => reject(new Error(t('Could not read the photo')))
        r.readAsDataURL(f)
      })
      await api('/api/photos', { method: 'POST', body: JSON.stringify({ d, note: note.trim(), file: { type: f.type, data } }) })
      setNote('')
      toast(t('Photo saved'))
      load()
    } catch (err) { toast(err.message) } finally { setBusy(false) }
  }
  const remove = id => api('/api/photos/delete', { method: 'POST', body: JSON.stringify({ id }) })
    .then(() => { toast(t('Photo deleted')); load() }).catch(err => toast(err.message))

  if (!photos) return <div className="muted small">{t('Loading…')}</div>
  // the first and the latest, side by side: the visible progress
  const oldest = photos[photos.length - 1], newest = photos[0]
  const pair = photos.length > 1

  return <div style={{ display: 'grid', gap: 12 }}>
    {canUpload && <div className="card" style={{ display: 'grid', gap: 8 }}>
      <label className="small muted" htmlFor="ph-date">{t('Date')}</label>
      <input id="ph-date" type="date" className="field" value={d} max={todayISO()} onChange={e => setD(e.target.value || todayISO())} />
      <TextArea rows={2} maxLength={200} placeholder={t('A note (optional): week 4, after the cut…')} aria-label={t('Note')} value={note} onChange={e => setNote(e.target.value)} />
      <label className="btn primary" style={{ margin: 0, cursor: busy ? 'wait' : 'pointer', textAlign: 'center' }}>
        <Icon name="plus" /> {busy ? t('Saving…') : t('Add a progress photo')}
        <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={upload} disabled={busy}
          style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} aria-label={t('Add a progress photo')} />
      </label>
      <div className="dim small">{t('JPG, PNG or WebP, up to 3.5 MB. Only you and your trainer see them.')}</div>
    </div>}

    {!photos.length && <div className="empty small">{canUpload ? t('No photos yet. Add one each week to see your progress.') : t('No progress photos yet.')}</div>}

    {pair && <div className="card">
      <h2 style={{ margin: '0 0 8px' }}>{t('Progress')}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[oldest, newest].map((p, i) => <figure key={p.id} style={{ margin: 0 }}>
          <img src={photoUrl(owner, p.id)} alt={fmtDate(p.d, true)} loading="lazy" style={{ width: '100%', borderRadius: 12, background: 'var(--surface-2)', display: 'block' }} />
          <figcaption className="dim" style={{ fontSize: '.72rem', marginTop: 4 }}>{i ? t('Latest') : t('First')} · {fmtDate(p.d, true)}</figcaption>
        </figure>)}
      </div>
    </div>}

    {photos.length > 0 && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
      {photos.map(p => <figure key={p.id} style={{ margin: 0, position: 'relative' }}>
        <img src={photoUrl(owner, p.id)} alt={p.note || fmtDate(p.d, true)} loading="lazy" style={{ width: '100%', aspectRatio: '3 / 4', objectFit: 'cover', borderRadius: 10, background: 'var(--surface-2)', display: 'block' }} />
        <figcaption className="dim" style={{ fontSize: '.7rem', marginTop: 4, overflowWrap: 'anywhere' }}>{fmtDate(p.d, true)}{p.note ? ' · ' + p.note : ''}</figcaption>
        {canDelete && <button type="button" className="iconbtn" style={{ position: 'absolute', top: 4, right: 4, width: 40, height: 40, color: 'var(--red)', background: 'var(--surface)' }}
          onClick={() => remove(p.id)} aria-label={t('Delete photo')}><Icon name="trash" /></button>}
      </figure>)}
    </div>}
  </div>
}
