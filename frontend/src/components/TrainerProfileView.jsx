import { t } from '../lib/i18n.js'
import Icon from './Icon.jsx'

// A trainer's public profile (Trainnery), the same on the trainer's own "My profile" and on the
// client's "My trainer": name, age and experience up top, then whatever sections they filled in.
export const profileIsEmpty = p => !p || (!p.age && p.years == null && !p.story && !p.about && !p.certifications.length && !p.methods.length)

export default function TrainerProfileView({ profile: p }) {
  const meta = [p.age ? t('{0} years old', p.age) : null,
    p.years != null ? (p.years === 1 ? t('1 year of experience') : t('{0} years of experience', p.years)) : null].filter(Boolean)
  const Block = ({ title, children }) => <div className="card">
    <h2 style={{ margin: '0 0 8px', fontSize: 17 }}>{title}</h2>{children}</div>
  const prose = s => <div className="small" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: 1.5 }}>{s}</div>

  return <>
    <div className="card row" style={{ gap: 14, alignItems: 'center' }}>
      <div aria-hidden="true" style={{ width: 64, height: 64, borderRadius: '50%', flex: 'none', display: 'grid', placeItems: 'center',
        background: 'var(--acc)', color: 'var(--on-acc)', fontSize: 28, fontWeight: 700 }}>{(p.name || '?').trim().charAt(0).toUpperCase()}</div>
      <div style={{ minWidth: 0 }}>
        <div className="capitalize" style={{ fontSize: 22, fontWeight: 700, overflowWrap: 'anywhere' }}>{p.name}</div>
        <div className="muted small">{meta.length ? meta.join(' · ') : t('Personal trainer')}</div>
      </div>
    </div>
    {p.story && <Block title={t('My story')}>{prose(p.story)}</Block>}
    {p.certifications.length > 0 && <Block title={t('Certifications')}>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {p.certifications.map(c => <li key={c} className="row small" style={{ gap: 8, alignItems: 'flex-start' }}>
          <Icon name="medal" style={{ color: 'var(--acc)', flex: 'none', marginTop: 2 }} /><span style={{ overflowWrap: 'anywhere' }}>{c}</span></li>)}
      </ul>
    </Block>}
    {p.methods.length > 0 && <Block title={t('Favourite methodologies')}>
      <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>{p.methods.map(m => <span key={m} className="tag acc nocap">{m}</span>)}</div>
    </Block>}
    {p.about && <Block title={t('About me')}>{prose(p.about)}</Block>}
  </>
}
