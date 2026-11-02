import { memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, MotionConfig } from 'motion/react'
import { Barbell, Scales, ChatCircle, Target, ClipboardText, Camera, ForkKnife, Fingerprint, ShieldCheck, ChartLineUp, UserCircle, Sparkle, ArrowRight, Heartbeat, Users, Envelope, Buildings, Shuffle, Palette, Eye, UserPlus, Megaphone, ChatsCircle, CheckCircle, XCircle, CalendarCheck } from '@phosphor-icons/react'
import { LogoMark, BRAND } from '../components/Logo.jsx'
import PromoCharts from '../components/PromoCharts.jsx'

// Public front page for people who are not signed in yet. Styles are scoped under .lp so they
// cannot leak into the app. Layout: an asymmetric hero, then rows instead of card grids, a plan
// list, and charts. Motion uses springs and transforms only; reduced motion is respected below.

const WEIGHT_WEEKS = [84.2, 83.6, 83.9, 82.8, 82.1, 81.7, 80.9, 80.4, 79.6, 79.2, 78.7, 78.4]

const GYM = [
  { icon: UserPlus, title: 'Invitaciones con permisos', text: 'Invita a cada entrenador con su enlace y a tus socios con un código. Al enviarlo eliges qué puede hacer cada uno: ver a todos los socios, asignarlos o publicar para todo el gimnasio.' },
  { icon: Shuffle, title: 'Reparto por turno y cupo', text: 'Asigna cada socio a un entrenador, o deja que la app reparta a los que no tienen uno según su turno y el cupo libre de cada entrenador.' },
  { icon: CalendarCheck, title: 'Quién tiene entreno y quién no', text: 'Ves si cada socio tiene entrenamiento asignado. El entreno lo diseña siempre su entrenador: el gimnasio organiza, el entrenador entrena.' },
  { icon: Eye, title: 'Quién dejó de venir', text: 'Cada socio con su estado (al día o sin actividad) y la carga de cada entrenador, sin entrar en sus datos privados.' },
  { icon: ChatsCircle, title: 'Mensajes con socios y entrenadores', text: 'Escribe a cualquier socio o entrenador desde su ficha. Ellos te responden desde la app.' },
  { icon: Megaphone, title: 'Contenido del gimnasio', text: 'Publica horarios, avisos y guías. Tus socios lo ven junto al contenido de su entrenador, y cada publicación dice quién la subió.' },
  { icon: Buildings, title: 'Socios del gimnasio y clientes propios', text: 'Los clientes que tus entrenadores atienden en el gimnasio son tus socios. Si un entrenador se va, sus socios vuelven a la lista para reasignarlos.' },
  { icon: Palette, title: 'Tus colores', text: 'Tu equipo y tus socios ven la app con los colores de tu marca.' },
]

const GYM_PLANS = [
  { name: 'Básico', seats: 'Hasta 100 socios', staff: '3 entrenadores' },
  { name: 'Pro', seats: 'Hasta 400 socios', staff: '10 entrenadores' },
  { name: 'Cadena', seats: 'Varias sedes', staff: 'Hasta 100 entrenadores' },
]

// What the gym panel shows, as an example: invented trainers, no real gym
const GYM_LOAD = [
  { who: 'Andrea', shift: 'Mañana', n: 38 },
  { who: 'Luis', shift: 'Tarde', n: 44 },
  { who: 'Carla', shift: 'Noche', n: 21 },
]
const GYM_MAIL = 'mailto:support@trainnery.com?subject=' + encodeURIComponent('Trainnery para mi gimnasio')

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

function GymPanel() {
  return <motion.figure className="lp-panel" aria-label="Ejemplo del panel de un gimnasio" variants={rise} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }}>
    <figcaption className="lp-panel-top">
      <span className="lp-panel-who"><Buildings size={30} weight="regular" aria-hidden="true" />Panel del gimnasio (ejemplo)</span>
      <span className="lp-panel-tag">Plan Pro</span>
    </figcaption>
    <div className="lp-gtiles">
      <div><span>Socios</span><b>186</b></div>
      <div><span>Entrenadores</span><b>6</b></div>
      <div><span>Sin entrenador</span><b className="lp-warn">4</b></div>
    </div>
    <div className="lp-panel-label lp-load-title">Carga de cada entrenador</div>
    <motion.ul className="lp-load" variants={stagger}>
      {GYM_LOAD.map(t => <li key={t.who}>
        <span className="lp-load-who">{t.who}<small>{t.shift}</small></span>
        <span className="lp-load-bar" role="img" aria-label={`${t.n} de 50 socios`}><motion.i style={{ width: `${t.n * 2}%` }}
          variants={{ hidden: { scaleX: 0 }, show: { scaleX: 1, transition: { type: 'spring', stiffness: 90, damping: 20 } } }} /></span>
        <span className="lp-load-n">{t.n}/50</span>
      </li>)}
    </motion.ul>
    <div className="lp-gauto"><Shuffle size={18} weight="regular" aria-hidden="true" /> Asignar automáticamente a los 4 sin entrenador</div>
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
      <nav className="lp-nav">
        <button type="button" className="lp-link lp-link-dim" onClick={() => document.getElementById('gimnasios')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>Gimnasios</button>
        <button type="button" className="lp-link" onClick={start}>Iniciar sesión</button>
      </nav>
    </header>

    <section className="lp-hero" aria-labelledby="lp-h1">
      <motion.div className="lp-hero-copy" variants={stagger} initial="hidden" animate="show">
        <motion.p className="lp-kicker" variants={rise}>Para gimnasios, entrenadores personales y sus clientes</motion.p>
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

    <section className="lp-sec" id="gimnasios" aria-labelledby="lp-gyms">
      <div className="lp-sec-head">
        <p className="lp-eyebrow">Para gimnasios</p>
        <h2 id="lp-gyms">Tu gimnasio, tus entrenadores y tus socios, en una sola app</h2>
        <p className="lp-sub">Organiza a tus entrenadores por turno, reparte a tus socios entre ellos y ve quién entrena y quién no. Cada socio recibe el entreno de su entrenador en su teléfono.</p>
      </div>
      <div className="lp-gym-grid">
        <GymPanel />
        <motion.div className="lp-privacy" variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }}>
          <motion.h3 variants={rise}>Lo que ve el gimnasio de cada socio</motion.h3>
          <motion.ul variants={rise} className="lp-check">
            <li><CheckCircle size={20} weight="regular" aria-hidden="true" /> Su nombre, su turno y su entrenador</li>
            <li><CheckCircle size={20} weight="regular" aria-hidden="true" /> Si tiene entrenamiento asignado</li>
            <li><CheckCircle size={20} weight="regular" aria-hidden="true" /> Si está al día o dejó de entrenar</li>
          </motion.ul>
          <motion.h3 variants={rise}>Lo que no ve</motion.h3>
          <motion.ul variants={rise} className="lp-check lp-no">
            <li><XCircle size={20} weight="regular" aria-hidden="true" /> Su peso, medidas, comidas ni fotos</li>
            <li><XCircle size={20} weight="regular" aria-hidden="true" /> Sus mensajes con su entrenador</li>
            <li><XCircle size={20} weight="regular" aria-hidden="true" /> Los clientes que cada entrenador tiene por su cuenta</li>
          </motion.ul>
          <motion.p variants={rise} className="lp-fine lp-privacy-note">El socio lo sabe antes de unirse y puede salir del gimnasio cuando quiera.</motion.p>
        </motion.div>
      </div>
      <motion.ul className="lp-rows" variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.1 }}>
        {GYM.map(r => <Row key={r.title} {...r} />)}
      </motion.ul>
      <div className="lp-sec-head lp-gym-plans-head">
        <h3 className="lp-h3">Planes para gimnasios</h3>
        <p className="lp-sub">Según cuántos socios y entrenadores tienes. Escríbenos y te damos el precio para tu gimnasio.</p>
      </div>
      <motion.ul className="lp-plans" variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}>
        {GYM_PLANS.map(p => <motion.li key={p.name} className="lp-plan lp-plan-gym" variants={rise}>
          <div className="lp-plan-name">{p.name}</div>
          <div className="lp-plan-seats">{p.seats}</div>
          <div className="lp-plan-seats">{p.staff}</div>
        </motion.li>)}
      </motion.ul>
      <div className="lp-gym-cta">
        <a className="lp-btn" href={GYM_MAIL}>Quiero Trainnery en mi gimnasio <ArrowRight size={18} weight="regular" aria-hidden="true" /></a>
        <span className="lp-fine">O escribe a <a href={GYM_MAIL}>support@trainnery.com</a>. Lo activamos para tu gimnasio y te ayudamos a invitar a tu equipo.</span>
      </div>
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
.lp-sub a{color:var(--accent)}
.lp-nav{display:flex;align-items:center;gap:4px}
.lp-link-dim{color:#ecebe6}
.lp-h3{font-family:"Syne",system-ui,sans-serif;font-weight:800;font-size:1.35rem;margin:0 0 8px}
.lp-gym-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:16px;margin-bottom:28px}
@media (min-width:900px){.lp-gym-grid{grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:24px}}
.lp-gtiles{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.lp-gtiles div{background:#1d2024;border-radius:14px;padding:10px 12px;min-width:0}
.lp-gtiles div{display:flex;flex-direction:column;justify-content:space-between}
.lp-gtiles span{display:block;font-size:.75rem;line-height:1.25;color:var(--muted)}
.lp-gtiles b{font-family:"Syne",system-ui,sans-serif;font-size:1.6rem;font-variant-numeric:tabular-nums}
.lp-warn{color:#f0a73a}
.lp-load-title{margin:16px 0 8px}
.lp-load{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.lp-load li{display:grid;grid-template-columns:76px minmax(0,1fr) 44px;gap:10px;align-items:center;font-size:.9rem}
.lp-load-who{display:flex;flex-direction:column;line-height:1.2;font-weight:600}
.lp-load-who small{color:var(--muted);font-weight:400;font-size:.75rem}
.lp-load-bar{height:8px;border-radius:99px;background:#24272b;overflow:hidden}
.lp-load-bar i{display:block;height:100%;border-radius:99px;background:var(--accent);transform-origin:0 50%}
.lp-load-n{text-align:right;color:var(--muted);font-variant-numeric:tabular-nums;font-size:.82rem}
.lp-gauto{display:flex;align-items:center;gap:8px;margin-top:16px;padding:12px 14px;border-radius:14px;background:color-mix(in srgb,var(--accent) 12%,transparent);color:var(--accent);font-weight:600;font-size:.9rem}
.lp-privacy{background:var(--surface);border-radius:28px;padding:22px;box-shadow:inset 0 0 0 1px var(--line);min-width:0}
.lp-privacy h3{font-size:1.05rem;margin:0 0 10px}
.lp-check{list-style:none;margin:0 0 18px;padding:0;display:grid;gap:8px}
.lp-check li{display:flex;gap:10px;align-items:flex-start;color:#d6d5cf;font-size:.95rem}
.lp-check li svg{flex:none;margin-top:2px;color:var(--accent)}
.lp-no{margin-bottom:0}
.lp-no li svg{color:#8a8983}
.lp-privacy-note{margin-top:14px}
.lp-gym-plans-head{margin-top:44px}
@media (min-width:760px){.lp-plan.lp-plan-gym{grid-template-columns:repeat(3,minmax(0,1fr))}}
.lp-gym-cta{display:flex;flex-wrap:wrap;align-items:center;gap:14px 20px;margin-top:28px}
.lp-gym-cta .lp-btn{text-decoration:none}
.lp-gym-cta .lp-fine{margin:0}
.lp-fine a{color:var(--accent)}
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
