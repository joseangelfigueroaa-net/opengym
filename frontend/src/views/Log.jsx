import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { api } from '../lib/api.js'
import { t } from '../lib/i18n.js'
import { fmtDate, fmtNum } from '../lib/format.js'
import { RECORD_KINDS, MEASURE_ZONES, recordText, deleteRecord } from '../lib/trainer.js'
import { confirmSheet } from '../sheets.jsx'
import { recordSheet } from '../components/RecordSheet.jsx'
import LineChart from '../components/LineChart.jsx'
import Icon from '../components/Icon.jsx'

// The client's "Log" tab: one tap per thing to note down — weight, body fat, measurements,
// steps, sleep, a meal — and the list of what's been logged, by them or by their trainer.
// Until Apple Health / Health Connect sync arrives, this is how those numbers get in.

export default function Log() {
  const user = useStore(s => s.user)
  const S = useStore(s => s.S)
  const toast = useUI(s => s.toast)
  const [recs, setRecs] = useState(null)
  const load = () => api('/api/records').then(d => setRecs(d.records)).catch(() => setRecs([]))
  useEffect(() => { if (user) load(); else setRecs([]) }, [!!user])

  const del = r => confirmSheet({
    title: t('Delete this record?'), message: recordText(r.kind, r.v) + ' · ' + fmtDate(r.d, true),
    confirmText: t('Delete'), danger: true,
    onConfirm: () => deleteRecord(r.id).then(() => { toast(t('Record deleted')); load() }).catch(e => toast(e.message))
  })
  const fat = (recs || []).filter(r => r.kind === 'fat').slice().reverse()
  const zones = MEASURE_ZONES.map(([k, label]) => {
    const v = (recs || []).filter(r => r.kind === 'measures' && r.v[k] != null)
    return v.length ? { k, label, first: v[v.length - 1].v[k], last: v[0].v[k] } : null
  }).filter(Boolean)
  const lastW = S.bodyweight[S.bodyweight.length - 1]

  return <div className="narrow">
    <div className="hdr"><div style={{ flex: 1 }}><h1 style={{ margin: 0 }}>{t('Log')}</h1>
      <div className="sub">{t('Your trainer sees what you log here')}</div></div></div>

    <div className="log-grid">
      {Object.entries(RECORD_KINDS).map(([k, def]) => (
        <button key={k} className="card log-btn" disabled={!user && k !== 'weight'}
          onClick={() => recordSheet({ kind: k, onSaved: load })}>
          <span className="iconbtn" aria-hidden="true" style={{ color: 'var(--acc)' }}><Icon name={def.icon} /></span>
          <span style={{ fontWeight: 600 }}>{t(def.label)}</span>
          {k === 'weight' && lastW && <span className="dim" style={{ fontSize: '.72rem' }}>{fmtNum(lastW.w)} {S.unit} · {fmtDate(lastW.d)}</span>}
        </button>
      ))}
    </div>
    {!user && <div className="empty small">{t('Create a profile to log body fat, measurements, steps, sleep and meals, and share them with a trainer.')}</div>}

    {fat.length > 1 && <div className="card">
      <h2 style={{ margin: '0 0 8px' }}>{t('Body fat')}</h2>
      <div className="chart"><LineChart points={fat.map(r => ({ t: new Date(r.d).getTime(), y: r.v.pct, d: r.d }))} h={130} unit="%" /></div>
    </div>}

    {zones.length > 0 && <div className="card">
      <h2 style={{ margin: '0 0 8px' }}>{t('Measurements (cm)')}</h2>
      <table className="dtable">
        <thead><tr><th>{t('Zone')}</th><th className="n">{t('Initial')}</th><th className="n">{t('Now')}</th></tr></thead>
        <tbody>{zones.map(z => <tr key={z.k}><td>{t(z.label)}</td><td className="n">{fmtNum(z.first)}</td><td className="n"><b>{fmtNum(z.last)}</b></td></tr>)}</tbody>
      </table>
    </div>}

    {user && <>
      <h4 className="sec">{t('Recently logged')}</h4>
      {!recs ? <div className="muted small">{t('Loading…')}</div>
        : recs.length ? <div className="card" style={{ padding: '4px 14px' }}>
          {recs.slice(0, 30).map((r, i) => <div key={r.id} className="row between" style={{ padding: '8px 0', borderTop: i ? '1px solid var(--sep)' : 'none', gap: 8 }}>
            <div style={{ minWidth: 0 }}>
              <div className="small" style={{ overflowWrap: 'anywhere' }}><b>{t(RECORD_KINDS[r.kind].label)}</b> · {recordText(r.kind, r.v)}</div>
              <div className="dim" style={{ fontSize: '.72rem' }}>{fmtDate(r.d, true)} · {r.role === 'trainer' ? t('by your trainer') : t('by you')}</div>
            </div>
            {r.role === 'client' && <button className="iconbtn" style={{ width: 44, height: 44, fontSize: 16, color: 'var(--red)' }} onClick={() => del(r)} aria-label={t('Delete record')}><Icon name="trash" /></button>}
          </div>)}
        </div>
        : <div className="empty small">{t('Nothing logged yet. Tap one of the buttons above.')}</div>}
    </>}
  </div>
}
