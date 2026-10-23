import { motion } from 'motion/react'

// Three animated progress charts for the landing page: body weight going down, strength going up,
// and daily energy going up. The numbers are an ILLUSTRATIVE 12-week example, not real client data,
// and the page says so next to the charts. Lines draw themselves when they scroll into view, and the
// landing's MotionConfig (reducedMotion="user") turns the motion off for people who ask for less.

const WEEKS = 12
const W = 320, H = 170, PAD_L = 24, PAD_R = 12, PAD_T = 14, PAD_B = 26

export const SERIES = [
  { key: 'weight', title: 'Peso corporal', unit: 'kg', from: 86, to: 78, note: 'bajó 8 kg', line: 'de 86 a 78 kg' },
  { key: 'strength', title: 'Fuerza en sentadilla', unit: 'kg', from: 80, to: 105, note: 'subió 25 kg', line: 'de 80 a 105 kg' },
  { key: 'vitality', title: 'Energía diaria', unit: '/10', from: 4, to: 9, note: 'de 4 a 9', line: 'de 4 a 9 sobre 10' },
]

// A smooth curve from `from` to `to` with a small, fixed wobble so it reads like real weeks.
// Deterministic on purpose: the same numbers on every visit.
export function curve(from, to, weeks = WEEKS) {
  return Array.from({ length: weeks }, (_, i) => {
    const t = i / (weeks - 1)
    const ease = t * t * (3 - 2 * t)
    const wobble = Math.sin(i * 1.7) * (Math.abs(to - from) * 0.02)
    return from + (to - from) * ease + wobble
  })
}

export function plot(values) {
  const min = Math.min(...values) - 1, max = Math.max(...values) + 1
  const x = i => PAD_L + (i * (W - PAD_L - PAD_R)) / (values.length - 1)
  const y = v => PAD_T + (1 - (v - min) / (max - min)) * (H - PAD_T - PAD_B)
  const pts = values.map((v, i) => ({ x: x(i), y: y(v) }))
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  return { pts, d }
}

function Chart({ s }) {
  const values = curve(s.from, s.to)
  const { pts, d } = plot(values)
  return <figure className="lp-chart">
    <figcaption>
      <span className="lp-chart-title">{s.title}</span>
      <span className="lp-chart-note">{s.note}</span>
    </figcaption>
    <svg viewBox={`0 0 ${W} ${H}`} role="img"
      aria-label={`${s.title}, ejemplo de 12 semanas: ${s.line}`}>
      {[0, 1, 2].map(k => <line key={k} x1={PAD_L} x2={W - PAD_R} y1={PAD_T + k * (H - PAD_T - PAD_B) / 2} y2={PAD_T + k * (H - PAD_T - PAD_B) / 2}
        style={{ stroke: 'var(--sep, #38383a)' }} strokeWidth="1" />)}
      <motion.path d={d} fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
        style={{ stroke: 'var(--green)' }}
        initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }}
        viewport={{ once: true, amount: 0.5 }} transition={{ duration: 1.6, ease: 'easeOut' }} />
      {pts.map((p, i) => <motion.circle key={i} cx={p.x} cy={p.y} r="3.5" style={{ fill: 'var(--green)' }}
        initial={{ opacity: 0, scale: 0 }} whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, amount: 0.5 }} transition={{ delay: 0.12 * i, duration: 0.3 }} />)}
      {[0, 5, 11].map(i => <text key={i} x={pts[i].x} y={H - 6} textAnchor={i === 0 ? 'start' : i === WEEKS - 1 ? 'end' : 'middle'}
        style={{ fill: 'var(--label-3, #8e8e93)', fontSize: 10 }}>{`Sem ${i + 1}`}</text>)}
    </svg>
  </figure>
}

export default function PromoCharts() {
  return <div className="lp-grid lp-charts">
    {SERIES.map(s => <Chart key={s.key} s={s} />)}
  </div>
}
