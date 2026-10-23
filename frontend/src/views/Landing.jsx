import { memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, MotionConfig } from 'motion/react'
import { Barbell, Scales, ChatCircle, Target, ClipboardText, Camera, ForkKnife, Fingerprint, ShieldCheck, ChartLineUp, UserCircle, Sparkle, ArrowRight, Heartbeat, Users, Envelope } from '@phosphor-icons/react'
import { LogoMark, BRAND } from '../components/Logo.jsx'
import PromoCharts from '../components/PromoCharts.jsx'

// Public front page for people who are not signed in yet. Styles are scoped under .lp so they
// cannot leak into the app. Layout: an asymmetric hero, then rows instead of card grids, a plan
// list, and charts. Motion uses springs and transforms only; reduced motion is respected below.

const WEIGHT_WEEKS = [84.2, 83.6, 83.9, 82.8, 82.1, 81.7, 80.9, 80.4, 79.6, 79.2, 78.7, 78.4]

const TRAINER = [
  { icon: Users, title: 'Tus clientes en una sola lista', text: 'Cada cliente con su estado: al día, sin actividad o estancado. Abres su ficha y ves peso, grasa, medidas, entrenos y comidas.' },
  { icon: Barbell, title: 'Entrenos asignados por día', text: 'Envía el entreno de hoy o un plan de hasta 62 días. El cliente lo recibe en su app con un aviso al teléfono.' },
  { icon: Sparkle, title: 'Contenido para tus clientes', text: 'Publica guías, PDFs e imágenes. Tus clientes las ven en su app y reaccionan con emojis.' },
  { icon: ChatCircle, title: 'Chat con cada cliente', text: 'Conversa dentro de la app, con avisos al teléfono y mensajes leídos.' },
  { icon: UserCircle, title: 'Tu perfil público', text: 'Comparte tu perfil con tus clientes para que te conozcan mejor.' },
  { icon: Target, title: 'Comenta y reacciona', text: 'Reacciona a entrenos, registros y avances. Comenta las comidas de tus clientes.' },
]

const CLIENT = [
  { icon: Scales, title: 'Registra lo que importa', text: 'Peso, grasa corporal, medidas, pasos y sueño. Un toque por cada dato.' },
  { icon: ForkKnife, title: 'Escribe lo que comiste', text: 'Describe la comida y la app calcula las calorías y los macros por ti. Tu entrenador puede corregirlos.' },
  { icon: ClipboardText, title: 'Medidas con tu altura', text: 'Incluye tu altura para ver tu índice de masa corporal (IMC) junto a tu peso.' },
  { icon: Camera, title: 'Fotos de progreso', text: 'Sube tus fotos cada semana y compara la primera con la última. Solo tú y tu entrenador las ven.' },
  { icon: ChartLineUp, title: 'Gráficas de avance', text: 'Peso, grasa y medidas en el tiempo, y cómo sube el peso en los ejercicios que más repites.' },
  { icon: Heartbeat, title: 'Reacciones y comentarios', text: 'Tu entrenador reacciona a tus entrenos y comenta tus comidas. Tú reaccionas a su contenido.' },
]

const PLANS = [
  { name: 'Free', seats: '1 cliente', price: 'Gratis', body: 'Para empezar con un cliente.' },
  { name: 'Silver', seats: '5 clientes', price: '9,99', body: 'Comidas, macros y cálculo de calorías para ti y tus clientes.' },
  { name: 'Gold', seats: '25 clientes', price: '34,99', body: 'Todo lo de Silver para tu cartera de clientes.' },
  { name: 'Platinum', seats: '50 clientes', price: '49,99', body: 'Para entrenadores con gimnasio o mucha clientela.' },
]

const rise = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 20 } } }
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } } }

// Perpetual but isolated: the only thing that loops on the hero, kept out of the parent's renders.
const LiveDot = memo(function LiveDot() {
  return <span className="lp-live" aria-hidden="true" />
})

function HeroPanel() {
  return <motion.figure className="lp-panel" aria-label="Ejemplo de la ficha de un cliente" variants={rise} initial="hidden" animate="show">
    <figcaption className="lp-panel-top">
      <span className="lp-panel-who"><UserCircle size={34} weight="regular" aria-hidden="true" />Ejemplo de cliente</span>
      <span className="lp-panel-tag"><LiveDot /> Al día</span>
    </figcaption>
    <div className="lp-panel-stat">
      <div>
        <div className="lp-panel-label">Peso, últimas 12 semanas</div>
        <div className="lp-panel-value">78,4 <small>kg</small></div>
      </div>
      <div className="lp-panel-delta">−5,8 kg</div>
    </div>
    <motion.div className="lp-bars" variants={stagger} initial="hidden" animate="show" role="img"
      aria-label="Peso bajando de 84,2 a 78,4 kilos en 12 semanas">
      {WEIGHT_WEEKS.map((w, i) => {
        const h = ((w - 76) / (85 - 76)) * 100
        return <motion.span key={i} className="lp-bar" style={{ height: `${h}%` }}
          variants={{ hidden: { scaleY: 0 }, show: { scaleY: 1, transition: { type: 'spring', stiffness: 100, damping: 20 } } }} />
      })}
    </motion.div>
    <ul className="lp-day">
      <li><span className="lp-day-when">Hoy</span><span>Pierna A, 45 min</span><span className="lp-day-state">Asignado</span></li>
      <li><span className="lp-day-when">Ayer</span><span>Comida: arroz con pollo</span><span className="lp-day-state">640 kcal</span></li>
    </ul>
  </motion.figure>
}

function Row({ icon: Icon, title, text }) {
  return <motion.li className="lp-row" variants={rise}>
    <div className="lp-row-head">
      <span className="lp-ico" aria-hidden="true"><Icon size={22} weight="regular" /></span>
      <h3>{title}</h3>
    </div>
    <p>{text}</p>
  </motion.li>
}

export default function Landing() {
  const nav = useNavigate()
  const start = () => nav('/login')
  return <MotionConfig reducedMotion="user"><div className="lp">
    <style>{CSS}</style>

    <header className="lp-top">
      <a href="#/" className="lp-brand" aria-label={BRAND}><LogoMark size={30} /><span className="lp-word">{BRAND}</span></a>
      <button type="button" className="lp-link" onClick={start}>Iniciar sesión</button>
    </header>

    <section className="lp-hero" aria-labelledby="lp-h1">
      <motion.div className="lp-hero-copy" variants={stagger} initial="hidden" animate="show">
        <motion.p className="lp-kicker" variants={rise}>Para entrenadores personales y sus clientes</motion.p>
        <motion.h1 id="lp-h1" variants={rise}>Entrena, registra y avanza con tu entrenador</motion.h1>
        <motion.p className="lp-lead" variants={rise}>Entrenos asignados, comidas con calorías calculadas, fotos y gráficas de avance, y un chat con cada cliente, todo en una sola app.</motion.p>
        <motion.div className="lp-cta" variants={rise}>
          <button type="button" className="lp-btn" onClick={start}>Crear mi perfil <ArrowRight size={18} weight="regular" aria-hidden="true" /></button>
          <button type="button" className="lp-btn lp-btn-ghost" onClick={start}>Ya tengo cuenta</button>
        </motion.div>
        <motion.p className="lp-fine" variants={rise}>Sin contraseñas: entras con passkey o con tu cuenta de Google.</motion.p>
      </motion.div>
      <HeroPanel />
    </section>

    <section className="lp-sec" aria-labelledby="lp-trainers">
      <div className="lp-sec-head">
        <p className="lp-eyebrow">Para entrenadores</p>
        <h2 id="lp-trainers">Tu trabajo, ordenado en un lugar</h2>
      </div>
      <motion.ul className="lp-rows" variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}>
        {TRAINER.map(r => <Row key={r.title} icon={r.icon} title={r.title} text={r.text} />)}
      </motion.ul>
    </section>

    <section className="lp-sec" aria-labelledby="lp-clients">
      <div className="lp-sec-head">
        <p className="lp-eyebrow">Para clientes</p>
        <h2 id="lp-clients">Lo que haces cada día, en un solo lugar</h2>
      </div>
      <motion.ul className="lp-rows" variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}>
        {CLIENT.map(r => <Row key={r.title} icon={r.icon} title={r.title} text={r.text} />)}
      </motion.ul>
    </section>

    <section className="lp-sec" aria-labelledby="lp-results">
      <div className="lp-sec-head">
        <p className="lp-eyebrow">Progreso</p>
        <h2 id="lp-results">Así se ve el progreso</h2>
        <p className="lp-sub">Ejemplo ilustrativo de un cliente en 12 semanas. No es el resultado de un cliente real: cada persona avanza a su propio ritmo.</p>
      </div>
      <PromoCharts />
    </section>

    <section className="lp-sec" aria-labelledby="lp-plans">
      <div className="lp-sec-head">
        <p className="lp-eyebrow">Planes para entrenadores</p>
        <h2 id="lp-plans">Elige según cuántos clientes atiendes</h2>
        <p className="lp-sub">Los precios son mensuales, en dólares (USD). Tus clientes entran con tu invitación.</p>
      </div>
      <motion.ul className="lp-plans" variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}>
        {PLANS.map(p => <motion.li key={p.name} className="lp-plan" variants={rise}>
          <div className="lp-plan-name">{p.name}</div>
          <div className="lp-plan-seats">{p.seats}</div>
          <div className="lp-plan-price">{p.price === 'Gratis' ? p.price : <>{p.price}<small> USD/mes</small></>}</div>
          <p>{p.body}</p>
        </motion.li>)}
      </motion.ul>
    </section>

    <section className="lp-sec lp-soon" aria-labelledby="lp-soon">
      <div className="lp-sec-head">
        <p className="lp-eyebrow">Próximamente</p>
        <h2 id="lp-soon">Lo que viene</h2>
      </div>
      <ul className="lp-list">
        <li><ShieldCheck size={18} weight="regular" aria-hidden="true" /> Sincronización con Apple Salud y Google Salud (Health Connect)</li>
        <li><Fingerprint size={18} weight="regular" aria-hidden="true" /> Lectura automática desde balanzas inteligentes</li>
        <li><Envelope size={18} weight="regular" aria-hidden="true" /> Avisos por correo además de la notificación del teléfono</li>
      </ul>
    </section>

    <section className="lp-final" aria-labelledby="lp-final">
      <div>
        <h2 id="lp-final">Empieza hoy</h2>
        <p>Crea tu perfil en un minuto, en el teléfono o en el computador.</p>
      </div>
      <button type="button" className="lp-btn" onClick={start}>Crear mi perfil <ArrowRight size={18} weight="regular" aria-hidden="true" /></button>
    </section>

    <footer className="lp-foot">
      <span>© {new Date().getFullYear()} {BRAND}</span>
      <span>Hecho para entrenadores de Venezuela y Latinoamérica</span>
    </footer>
  </div></MotionConfig>
}

const CSS = `
.lp{min-height:100vh;background:#0e0f11;color:#ecebe6;font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;overflow-x:hidden;padding-bottom:24px;--line:#26282c;--surface:#16181b;--muted:#9d9c96;--accent:#3fb97a}
.lp *{box-sizing:border-box}
.lp a:focus-visible,.lp button:focus-visible{outline:3px solid var(--accent);outline-offset:3px;border-radius:12px}
.lp h1,.lp h2,.lp h3,.lp-word,.lp-plan-price{font-family:"Syne",system-ui,sans-serif}
.lp-top{display:flex;align-items:center;justify-content:space-between;padding:16px max(16px,env(safe-area-inset-right,0px)) 16px max(16px,env(safe-area-inset-left,0px));max-width:1160px;margin:0 auto}
.lp-brand{display:flex;align-items:center;gap:10px;color:inherit;text-decoration:none}
.lp-word{font-weight:800;font-size:20px}
.lp-link{background:none;border:0;color:var(--accent);font:inherit;font-weight:600;min-height:44px;padding:0 8px;cursor:pointer}
.lp-hero{min-height:100dvh;display:grid;align-items:center;gap:40px;max-width:1160px;margin:0 auto;padding:32px max(16px,env(safe-area-inset-right,0px)) 56px max(16px,env(safe-area-inset-left,0px))}
.lp-hero-copy{min-width:0}
.lp-kicker{color:var(--accent);font-weight:600;margin:0 0 14px;font-size:.92rem;letter-spacing:.02em}
.lp-hero h1{font-weight:800;font-size:clamp(2rem,6.4vw,3rem);line-height:1.08;margin:0 0 18px;letter-spacing:-.02em;text-wrap:balance}
.lp-lead{font-size:clamp(1.02rem,2.2vw,1.2rem);color:var(--muted);margin:0 0 28px;max-width:34rem}
.lp-cta{display:flex;flex-wrap:wrap;gap:12px}
.lp-btn{display:inline-flex;align-items:center;gap:8px;min-height:50px;padding:0 22px;border-radius:14px;border:0;background:var(--accent);color:#0a1a10;font:inherit;font-weight:700;cursor:pointer;transition:transform .18s cubic-bezier(.16,1,.3,1),opacity .18s}
.lp-btn:hover{opacity:.92}
.lp-btn:active{transform:scale(.98)}
.lp-btn-ghost{background:var(--surface);color:#ecebe6;box-shadow:inset 0 0 0 1px var(--line)}
.lp-fine{font-size:.85rem;color:#7f7e78;margin:16px 0 0}
.lp-panel{margin:0;background:var(--surface);border-radius:28px;padding:22px;box-shadow:inset 0 0 0 1px var(--line),0 30px 60px -30px rgba(0,0,0,.6);min-width:0}
.lp-panel-top{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:18px}
.lp-panel-who{display:inline-flex;align-items:center;gap:10px;font-weight:600;font-size:.95rem;color:#ecebe6;min-width:0}
.lp-panel-tag{display:inline-flex;align-items:center;gap:8px;white-space:nowrap;font-size:.82rem;color:var(--accent);background:color-mix(in srgb,var(--accent) 12%,transparent);padding:6px 10px;border-radius:999px}
.lp-live{width:8px;height:8px;border-radius:50%;background:var(--accent);animation:lp-pulse 2.2s ease-in-out infinite}
@keyframes lp-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.7)}}
.lp-panel-stat{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;margin-bottom:14px}
.lp-panel-label{font-size:.8rem;color:var(--muted)}
.lp-panel-value{font-family:"Syne",system-ui,sans-serif;font-weight:800;font-size:2.4rem;line-height:1.05;font-variant-numeric:tabular-nums}
.lp-panel-value small{font-size:1rem;color:var(--muted);font-weight:600}
.lp-panel-delta{font-weight:700;color:var(--accent);font-variant-numeric:tabular-nums}
.lp-bars{display:grid;grid-template-columns:repeat(12,1fr);gap:6px;height:150px;align-items:end;padding:8px 0 14px;border-bottom:1px solid var(--line)}
.lp-bar{display:block;width:100%;min-height:6px;border-radius:6px 6px 3px 3px;background:linear-gradient(to top,color-mix(in srgb,var(--accent) 55%,transparent),var(--accent));transform-origin:50% 100%}
.lp-day{list-style:none;margin:14px 0 0;padding:0;display:grid;gap:10px}
.lp-day li{display:grid;grid-template-columns:52px 1fr auto;gap:10px;align-items:center;font-size:.92rem}
.lp-day-when{color:var(--muted);font-size:.8rem}
.lp-day-state{font-size:.8rem;color:var(--muted);font-variant-numeric:tabular-nums}
.lp-sec{padding:64px max(16px,env(safe-area-inset-right,0px)) 0 max(16px,env(safe-area-inset-left,0px));max-width:1160px;margin:0 auto}
.lp-sec-head{margin-bottom:22px;max-width:44rem}
.lp-eyebrow{color:var(--accent);font-weight:600;font-size:.85rem;letter-spacing:.06em;text-transform:uppercase;margin:0 0 8px}
.lp-sec h2,.lp-final h2{font-weight:800;font-size:clamp(1.55rem,3.6vw,2.2rem);line-height:1.15;margin:0 0 10px;letter-spacing:-.01em;text-wrap:balance}
.lp-sub{color:var(--muted);margin:0}
.lp-rows{list-style:none;margin:0;padding:0;border-top:1px solid var(--line)}
.lp-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.3fr);gap:6px 40px;padding:22px 0;border-bottom:1px solid var(--line)}
.lp-row-head{display:flex;align-items:center;gap:14px;min-width:0}
.lp-row h3{font-size:1.08rem;margin:0;line-height:1.3}
.lp-row p{margin:0;color:var(--muted);font-size:.98rem}
.lp-ico{display:inline-flex;flex:none;align-items:center;justify-content:center;width:40px;height:40px;border-radius:12px;background:color-mix(in srgb,var(--accent) 14%,transparent);color:var(--accent)}
.lp-charts{display:grid;grid-template-columns:1fr;gap:14px}
@media (min-width:760px){.lp-charts{grid-template-columns:repeat(2,minmax(0,1fr))}}
.lp-chart{margin:0;background:var(--surface);border-radius:20px;padding:18px;min-width:0;box-shadow:inset 0 0 0 1px var(--line)}
.lp-chart figcaption{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:4px 12px;margin-bottom:6px}
.lp-chart-title{font-weight:700}
.lp-chart-note{color:var(--accent);font-weight:700;font-size:.95rem}
.lp-chart svg{display:block;width:100%;height:auto}
.lp-plans{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:1fr;border-top:1px solid var(--line)}
.lp-plan{display:grid;grid-template-columns:minmax(0,1fr);gap:4px;padding:22px 0;border-bottom:1px solid var(--line)}
@media (min-width:760px){.lp-plan{grid-template-columns:minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1.6fr);gap:0 28px;align-items:baseline}}
.lp-plan-name{font-family:"Syne",system-ui,sans-serif;font-weight:800;font-size:1.25rem}
.lp-plan-seats{color:var(--muted)}
.lp-plan-price{font-weight:800;font-size:1.5rem;font-variant-numeric:tabular-nums}
.lp-plan-price small{font-size:.85rem;color:var(--muted);font-weight:600}
.lp-plan p{margin:0;color:var(--muted);font-size:.95rem}
.lp-soon .lp-list{list-style:none;margin:0;padding:0;display:grid;gap:12px}
.lp-list li{display:flex;align-items:flex-start;gap:12px;color:var(--muted)}
.lp-list li svg{margin-top:4px;color:var(--accent);flex:none}
.lp-final{margin:72px auto 0;max-width:1160px;padding:36px max(16px,env(safe-area-inset-right,0px)) 36px max(16px,env(safe-area-inset-left,0px));display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:20px;border-top:1px solid var(--line)}
.lp-final p{color:var(--muted);margin:0}
.lp-foot{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;padding:24px max(16px,env(safe-area-inset-right,0px)) 24px max(16px,env(safe-area-inset-left,0px));color:#7f7e78;font-size:.85rem;max-width:1160px;margin:0 auto;border-top:1px solid var(--line)}
@media (min-width:1080px){.lp-hero{grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);gap:56px}.lp-hero h1{font-size:clamp(2.4rem,4.2vw,3.4rem)}}
@media (max-width:759px){.lp-hero{padding-top:24px}.lp-row{grid-template-columns:minmax(0,1fr);gap:8px}}
@media (prefers-reduced-motion:reduce){.lp *{animation:none!important;transition:none!important}}
`
