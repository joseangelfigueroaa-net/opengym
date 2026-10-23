import { useNavigate } from 'react-router-dom'
import { MotionConfig } from 'motion/react'
import { LogoMark, BRAND } from '../components/Logo.jsx'
import Icon from '../components/Icon.jsx'

// Public front page for people who are not signed in yet: what Trainnery does for a trainer and
// for their clients, the plans, and how to start. Everything here is written for Spanish readers.
// Styles are scoped under .lp so they cannot leak into the app.
const TRAINER = [
  ['person', 'Tus clientes en una sola lista', 'Cada cliente con su estado: al día, sin actividad o estancado. Abres su ficha y ves peso, grasa, medidas, entrenos y comidas.'],
  ['dumbbell', 'Entrenos asignados por día', 'Envía el entreno de hoy o un plan de hasta 62 días. El cliente lo recibe en su app con un aviso al teléfono.'],
  ['sparkles', 'Contenido para tus clientes', 'Publica guías, PDFs e imágenes. Tus clientes las ven en su app y reaccionan con emojis.'],
  ['chat', 'Chat con cada cliente', 'Conversa dentro de la app, con avisos al teléfono y mensajes leídos.'],
  ['clipboard', 'Tu perfil público', 'Tu historia, certificaciones, años de experiencia y metodologías, visibles para tus clientes.'],
  ['target', 'Comenta y reacciona', 'Reacciona a entrenos, registros y avances. Comenta las comidas de tus clientes.'],
]
const CLIENT = [
  ['scale', 'Registra lo que importa', 'Peso, grasa corporal, medidas, pasos y sueño. Un toque por cada dato.'],
  ['clipboard', 'Escribe lo que comiste', 'Describe la comida y la app calcula las calorías y los macros por ti. Tu entrenador puede corregirlos.'],
  ['target', 'Medidas con tu altura', 'Incluye tu altura para ver tu índice de masa corporal (IMC) junto a tu peso.'],
  ['figureRun', 'Fotos de progreso', 'Sube tus fotos cada semana y compara la primera con la última. Solo tú y tu entrenador las ven.'],
  ['history', 'Gráficas de avance', 'Peso, grasa y medidas en el tiempo, y cómo sube el peso en los ejercicios que más repites.'],
  ['chat', 'Reacciones y comentarios', 'Tu entrenador reacciona a tus entrenos y comenta tus comidas. Tú reaccionas a su contenido.'],
]
const PLANS = [
  ['Free', '1 cliente', 'Para empezar con un cliente.'],
  ['Silver', '5 clientes', 'Comidas, macros y cálculo de calorías para ti y tus clientes.'],
  ['Gold', '25 clientes', 'Todo lo de Silver para tu cartera de clientes.'],
  ['Platinum', '50 clientes', 'Para entrenadores con gimnasio o mucha clientela.'],
]

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
      <p className="lp-kicker">Para entrenadores personales y sus clientes</p>
      <h1 id="lp-h1">Entrena, registra y avanza con tu entrenador</h1>
      <p className="lp-lead">Trainnery reúne a entrenadores y clientes: entrenos asignados, comidas con calorías calculadas, fotos y gráficas de avance, y un chat con cada cliente.</p>
      <div className="lp-cta">
        <button type="button" className="lp-btn" onClick={start}>Crear mi perfil</button>
        <button type="button" className="lp-btn lp-btn-ghost" onClick={start}>Ya tengo cuenta</button>
      </div>
      <p className="lp-fine">Sin contraseñas: entras con passkey o con tu cuenta de Google.</p>
    </section>

    <section className="lp-sec" aria-labelledby="lp-trainers">
      <h2 id="lp-trainers">Para entrenadores</h2>
      <div className="lp-grid">
        {TRAINER.map(([icon, title, body]) => <Card key={title} icon={icon} title={title} body={body} />)}
      </div>
    </section>

    <section className="lp-sec" aria-labelledby="lp-clients">
      <h2 id="lp-clients">Para clientes</h2>
      <div className="lp-grid">
        {CLIENT.map(([icon, title, body]) => <Card key={title} icon={icon} title={title} body={body} />)}
      </div>
    </section>

    <section className="lp-sec" aria-labelledby="lp-plans">
      <h2 id="lp-plans">Planes para entrenadores</h2>
      <p className="lp-sub">Eliges el plan según cuántos clientes atiendes. Tus clientes entran con tu invitación.</p>
      <div className="lp-grid lp-plans">
        {PLANS.map(([name, seats, body]) => <article key={name} className="lp-card lp-plan">
          <h3>{name}</h3>
          <div className="lp-seats">{seats}</div>
          <p>{body}</p>
        </article>)}
      </div>
    </section>


    <section className="lp-sec lp-soon" aria-labelledby="lp-soon">
      <h2 id="lp-soon">Próximamente</h2>
      <ul className="lp-list">
        <li>Sincronización con Apple Salud y Google Salud (Health Connect)</li>
        <li>Lectura automática desde balanzas inteligentes</li>
      </ul>
    </section>

    <section className="lp-final" aria-labelledby="lp-final">
      <h2 id="lp-final">Empieza hoy</h2>
      <p>Crea tu perfil en un minuto, en el teléfono o en el computador.</p>
      <button type="button" className="lp-btn" onClick={start}>Crear mi perfil</button>
    </section>

    <footer className="lp-foot">
      <span>© {new Date().getFullYear()} {BRAND}</span>
      <span>Hecho para entrenadores de Venezuela y Latinoamérica</span>
    </footer>
  </div></MotionConfig>
}

function Card({ icon, title, body }) {
  return <article className="lp-card">
    <span className="lp-ico" aria-hidden="true"><Icon name={icon} /></span>
    <h3>{title}</h3>
    <p>{body}</p>
  </article>
}

const CSS = `
.lp{min-height:100vh;background:var(--bg);color:var(--label);font-size:16px;line-height:1.55;overflow-x:hidden;padding-bottom:24px}
.lp *{box-sizing:border-box}
.lp a:focus-visible,.lp button:focus-visible{outline:3px solid var(--green);outline-offset:3px;border-radius:12px}
.lp-top{display:flex;align-items:center;justify-content:space-between;padding:16px;max-width:1120px;margin:0 auto}
.lp-brand{display:flex;align-items:center;gap:10px;color:inherit;text-decoration:none}
.lp-word{font-family:"Syne",system-ui,sans-serif;font-weight:800;font-size:20px}
.lp-link{background:none;border:0;color:var(--green);font:inherit;font-weight:600;min-height:44px;padding:0 8px;cursor:pointer}
.lp-hero{padding:40px 16px 56px;max-width:880px;margin:0 auto;text-align:left}
.lp-kicker{color:var(--green);font-weight:600;margin:0 0 12px;font-size:.95rem}
.lp-hero h1{font-family:"Syne",system-ui,sans-serif;font-weight:800;font-size:clamp(1.7rem,6.4vw,3.4rem);line-height:1.12;margin:0 0 18px;letter-spacing:-.02em;overflow-wrap:break-word;text-wrap:balance}
.lp-lead{font-size:clamp(1.05rem,2.4vw,1.25rem);color:var(--label-2,#c7c7cc);margin:0 0 26px;max-width:640px}
.lp-cta{display:flex;flex-wrap:wrap;gap:12px}
.lp-btn{min-height:48px;padding:0 22px;border-radius:14px;border:0;background:var(--green);color:#000;font:inherit;font-weight:700;cursor:pointer;transition:transform .15s ease,opacity .15s ease}
.lp-btn:hover{opacity:.9}
.lp-btn:active{transform:scale(.98)}
.lp-btn-ghost{background:var(--surface);color:var(--label)}
.lp-fine{font-size:.85rem;color:var(--label-3,#8e8e93);margin:14px 0 0}
.lp-sec{padding:40px 16px;max-width:1120px;margin:0 auto}
.lp-sec h2,.lp-final h2{font-family:"Syne",system-ui,sans-serif;font-weight:800;font-size:clamp(1.5rem,4vw,2.1rem);margin:0 0 18px;letter-spacing:-.01em}
.lp-sub{color:var(--label-2,#c7c7cc);margin:-8px 0 18px}
.lp-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,250px),1fr));gap:14px}
.lp-card{background:var(--surface);border-radius:18px;padding:20px;min-width:0}
.lp-card h3{font-size:1.05rem;margin:10px 0 6px}
.lp-card p{margin:0;color:var(--label-2,#c7c7cc);font-size:.95rem}
.lp-ico{display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:12px;background:color-mix(in srgb,var(--green) 16%,transparent);color:var(--green)}
.lp-charts{grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr))}
.lp-chart{margin:0;background:var(--surface);border-radius:18px;padding:16px;min-width:0}
.lp-chart figcaption{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:4px 12px;margin-bottom:6px}
.lp-chart-title{font-weight:700}
.lp-chart-note{color:var(--green);font-weight:700;font-size:.95rem}
.lp-chart svg{display:block;width:100%;height:auto}
.lp-plan{border:1px solid color-mix(in srgb,var(--green) 30%,transparent)}
.lp-plan h3{margin:0;font-family:"Syne",system-ui,sans-serif;font-size:1.25rem}
.lp-seats{color:var(--green);font-weight:700;margin:4px 0 10px}
.lp-soon{background:var(--surface);border-radius:18px;margin-top:8px}
.lp-list{margin:0;padding-left:20px;color:var(--label-2,#c7c7cc)}
.lp-final{padding:48px 16px;text-align:center;max-width:720px;margin:24px auto 0}
.lp-final p{color:var(--label-2,#c7c7cc);margin:0 0 20px}
.lp-foot{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;padding:24px 16px;color:var(--label-3,#8e8e93);font-size:.85rem;max-width:1120px;margin:0 auto;border-top:1px solid var(--sep,#38383a)}
@media (prefers-reduced-motion:reduce){.lp *{transition:none!important}}
`
