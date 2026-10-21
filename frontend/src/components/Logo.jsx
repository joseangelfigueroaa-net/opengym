// Trainnery logo: the trend-line mark on its green square, optionally with the wordmark.
// Same drawing as public/logo.svg and the landing page; the colours are the brand's, not the
// user's accent, so the logo looks the same whatever theme they picked.
export const BRAND = 'Trainnery'

export function LogoMark({ size = 32, title }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role={title ? 'img' : undefined}
      aria-label={title} aria-hidden={title ? undefined : 'true'} style={{ flexShrink: 0 }}>
      <rect width="32" height="32" rx="8" fill="#34d467" />
      <path d="M10 21L15 11L20 16.5L23 13" fill="none" stroke="#000" strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function Logo({ size = 32, wordSize = 22, className = '' }) {
  return (
    <span className={'brand ' + className} style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.32 }}>
      <LogoMark size={size} />
      <span className="brand-word" translate="no" style={{ fontSize: wordSize }}>{BRAND}</span>
    </span>
  )
}
