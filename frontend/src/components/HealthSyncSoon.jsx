import { t } from '../lib/i18n.js'
import Icon from './Icon.jsx'

// Apple Health / Health Connect and smart scale sync (Trainnery, Silver plan and up), announced
// before it ships: both need the native apps, since neither the platforms nor the scales hand
// that data to a web page. Until then the client logs steps, sleep, weight and body fat by hand,
// which is what this card points to.
export default function HealthSyncSoon() {
  return <div className="card" style={{ borderColor: 'color-mix(in srgb, var(--acc) 35%, transparent)' }}>
    <div className="row between" style={{ gap: 10, alignItems: 'flex-start' }}>
      <div className="row" style={{ gap: 10, minWidth: 0 }}>
        <span className="lrow-i" style={{ background: 'var(--red)', flex: 'none' }} aria-hidden="true"><Icon name="heart" /></span>
        <h2 style={{ margin: 0, fontSize: 17 }}>{t('Health sync')}</h2>
      </div>
      <span className="tag acc nocap" style={{ flex: 'none' }}>{t('Coming soon')}</span>
    </div>
    <div className="small muted" style={{ margin: '8px 0 10px', lineHeight: 1.45 }}>
      {t('Soon your steps, sleep, weight and body fat will arrive on their own from Apple Health, Google Health Connect and smart scales. Meanwhile, log them here.')}
    </div>
    <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
      {['Apple Salud', 'Google Health Connect', t('Smart scales')].map(name =>
        <span key={name} className="chip nocap" aria-disabled="true" style={{ background: 'var(--surface-3)', color: 'var(--label-2)', cursor: 'default' }}>
          <Icon name="lock" /> {name}</span>)}
    </div>
  </div>
}
