// pages/perfil.jsx – Cuestionario de perfil de riesgo
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const PREGUNTAS = [
  {
    id: 1,
    pregunta: '¿Qué harías si tu cartera cae un 15% en una semana?',
    opciones: [
      { texto: 'Vendo todo para no perder más', puntos: 1 },
      { texto: 'Me preocupo pero espero a ver qué pasa', puntos: 2 },
      { texto: 'Compro más porque es una oportunidad', puntos: 3 },
    ],
  },
  {
    id: 2,
    pregunta: '¿Cuánto tiempo podés dejar tu dinero invertido sin necesitarlo?',
    opciones: [
      { texto: 'Menos de 6 meses', puntos: 1 },
      { texto: 'Entre 6 meses y 2 años', puntos: 2 },
      { texto: 'Más de 2 años', puntos: 3 },
    ],
  },
  {
    id: 3,
    pregunta: '¿Qué preferís en una inversión?',
    opciones: [
      { texto: 'Seguridad: ganar poco pero sin riesgo', puntos: 1 },
      { texto: 'Equilibrio: algo de riesgo por más ganancia', puntos: 2 },
      { texto: 'Crecimiento: asumo riesgo por mayor retorno', puntos: 3 },
    ],
  },
  {
    id: 4,
    pregunta: 'Si el mercado sube 30% pero vos ganaste solo 5%, ¿cómo te sentís?',
    opciones: [
      { texto: 'Conforme, lo importante es no perder', puntos: 1 },
      { texto: 'Un poco frustrado, podría haber ganado más', puntos: 2 },
      { texto: 'Muy frustrado, quiero maximizar siempre', puntos: 3 },
    ],
  },
  {
    id: 5,
    pregunta: '¿Cómo describirías tu conocimiento sobre inversiones?',
    opciones: [
      { texto: 'Principiante, prefiero opciones simples', puntos: 1 },
      { texto: 'Intermedio, entiendo los conceptos básicos', puntos: 2 },
      { texto: 'Avanzado, me gusta analizar el mercado', puntos: 3 },
    ],
  },
];

const PERFILES = {
  conservador: {
    nombre: 'Conservador',
    emoji: '🛡️',
    color: '#34d399',
    bg: 'rgba(52,211,153,0.1)',
    border: 'rgba(52,211,153,0.3)',
    descripcion: 'Priorizás la seguridad sobre el rendimiento. Te sentís más cómodo con instrumentos de renta fija como bonos y LECAPs, que ofrecen retornos predecibles con bajo riesgo.',
    recomendacion: 'LECAPs, Bonos CER, AL30',
    distribucion: { renta_fija: 70, acciones: 20, cedears: 10 },
  },
  moderado: {
    nombre: 'Moderado',
    emoji: '⚖️',
    color: '#fbbf24',
    bg: 'rgba(251,191,36,0.1)',
    border: 'rgba(251,191,36,0.3)',
    descripcion: 'Buscás un equilibrio entre seguridad y crecimiento. Podés tolerar algo de volatilidad a cambio de mejores rendimientos en el mediano plazo.',
    recomendacion: 'Mix de acciones del Merval + bonos + algunos CEDEARs',
    distribucion: { renta_fija: 40, acciones: 40, cedears: 20 },
  },
  agresivo: {
    nombre: 'Agresivo',
    emoji: '🚀',
    color: '#f87171',
    bg: 'rgba(248,113,113,0.1)',
    border: 'rgba(248,113,113,0.3)',
    descripcion: 'Buscás maximizar el rendimiento y tolerás alta volatilidad. Preferís acciones y CEDEARs con alto potencial de crecimiento, sabiendo que pueden caer fuerte en el corto plazo.',
    recomendacion: 'Acciones Merval + CEDEARs tecnológicos (NVDA, TSLA, AAPL)',
    distribucion: { renta_fija: 10, acciones: 50, cedears: 40 },
  },
};

function calcularPerfil(respuestas) {
  const total = respuestas.reduce((sum, r) => sum + r, 0);
  if (total <= 8)  return 'conservador';
  if (total <= 12) return 'moderado';
  return 'agresivo';
}

export default function Perfil() {
  const router = useRouter();
  const { usuario, cargando } = useAuth();
  const [paso, setPaso]           = useState(0); // 0=intro, 1-5=preguntas, 6=resultado
  const [respuestas, setRespuestas] = useState([]);
  const [perfil, setPerfil]       = useState(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!cargando && !usuario) { router.push('/login'); return; }
    if (!cargando && usuario?.perfil_completado) { router.replace('/dashboard'); }
  }, [usuario, cargando]);

  const elegir = (puntos) => {
    const nuevas = [...respuestas, puntos];
    setRespuestas(nuevas);
    if (paso < PREGUNTAS.length) {
      setPaso(paso + 1);
    }
    if (paso === PREGUNTAS.length) {
      const p = calcularPerfil(nuevas);
      setPerfil(p);
      setPaso(6);
    }
  };

  const guardarYContinuar = async () => {
    setGuardando(true);
    try {
      const token = localStorage.getItem('mervaleta_token');
      await fetch(`${API}/auth/perfil-riesgo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ perfil_riesgo: perfil }),
      });
      router.replace('/dashboard');
    } catch {
      router.replace('/dashboard');
    }
  };

  if (cargando) return <Spinner />;

  const preguntaActual = PREGUNTAS[paso - 1];
  const perfilData = perfil ? PERFILES[perfil] : null;

  return (
    <div style={{ minHeight: '100vh', background: '#0b1120', fontFamily: 'system-ui,-apple-system,sans-serif', color: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 520 }}>

        {/* Intro */}
        {paso === 0 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎯</div>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: '#f1f5f9', margin: '0 0 12px', letterSpacing: -0.5 }}>
              ¿Cuál es tu perfil de inversor?
            </h1>
            <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7, marginBottom: 32, maxWidth: 380, margin: '0 auto 32px' }}>
              Antes de empezar a invertir, respondé 5 preguntas rápidas para conocer tu perfil de riesgo. Los brokers reales hacen esto con todos sus clientes.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 32 }}>
              {Object.values(PERFILES).map(p => (
                <div key={p.nombre} style={{ background: p.bg, border: `1px solid ${p.border}`, borderRadius: 12, padding: '14px 10px', textAlign: 'center' }}>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>{p.emoji}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: p.color }}>{p.nombre}</div>
                </div>
              ))}
            </div>
            <button onClick={() => setPaso(1)}
              style={{ background: 'linear-gradient(135deg,#059669,#0284c7)', color: '#fff', border: 'none', borderRadius: 14, padding: '14px 40px', fontSize: 15, fontWeight: 800, cursor: 'pointer', letterSpacing: 0.3 }}>
              Empezar →
            </button>
            <p style={{ fontSize: 11, color: '#334155', marginTop: 12 }}>Solo 5 preguntas · menos de 2 minutos</p>
          </div>
        )}

        {/* Preguntas */}
        {paso >= 1 && paso <= PREGUNTAS.length && preguntaActual && (
          <div>
            {/* Progreso */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#475569', marginBottom: 8 }}>
                <span>Pregunta {paso} de {PREGUNTAS.length}</span>
                <span>{Math.round((paso / PREGUNTAS.length) * 100)}%</span>
              </div>
              <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 4 }}>
                <div style={{ height: '100%', width: `${(paso / PREGUNTAS.length) * 100}%`, background: 'linear-gradient(90deg,#059669,#0284c7)', borderRadius: 4, transition: 'width .4s ease' }} />
              </div>
            </div>

            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9', marginBottom: 28, lineHeight: 1.3 }}>
              {preguntaActual.pregunta}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {preguntaActual.opciones.map((op, i) => (
                <button key={i} onClick={() => elegir(op.puntos)}
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '16px 20px', textAlign: 'left', cursor: 'pointer', fontSize: 14, color: '#e2e8f0', fontWeight: 500, transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 12, fontFamily: 'inherit' }}
                  onMouseEnter={e => { e.target.style.background = 'rgba(2,132,199,0.12)'; e.target.style.borderColor = 'rgba(2,132,199,0.4)'; }}
                  onMouseLeave={e => { e.target.style.background = 'rgba(255,255,255,0.04)'; e.target.style.borderColor = 'rgba(255,255,255,0.08)'; }}>
                  <span style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#475569', flexShrink: 0 }}>
                    {['A','B','C'][i]}
                  </span>
                  {op.texto}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Resultado */}
        {paso === 6 && perfilData && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>{perfilData.emoji}</div>
            <div style={{ display: 'inline-block', background: perfilData.bg, border: `1px solid ${perfilData.border}`, borderRadius: 20, padding: '4px 16px', fontSize: 12, fontWeight: 700, color: perfilData.color, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>
              Tu perfil
            </div>
            <h1 style={{ fontSize: 36, fontWeight: 900, color: '#f1f5f9', margin: '0 0 16px', letterSpacing: -1 }}>
              Inversor {perfilData.nombre}
            </h1>
            <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7, marginBottom: 28, maxWidth: 420, margin: '0 auto 28px' }}>
              {perfilData.descripcion}
            </p>

            {/* Distribución recomendada */}
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '20px', marginBottom: 24, textAlign: 'left' }}>
              <p style={{ fontSize: 12, color: '#475569', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14, fontWeight: 700 }}>Cartera recomendada para tu perfil</p>
              {[
                { label: 'Renta fija (bonos, letras)', pct: perfilData.distribucion.renta_fija, color: '#34d399' },
                { label: 'Acciones del Merval', pct: perfilData.distribucion.acciones, color: '#60a5fa' },
                { label: 'CEDEARs globales', pct: perfilData.distribucion.cedears, color: '#c084fc' },
              ].map(b => (
                <div key={b.label} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                    <span style={{ color: '#94a3b8' }}>{b.label}</span>
                    <span style={{ fontWeight: 700, color: b.color }}>{b.pct}%</span>
                  </div>
                  <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 4 }}>
                    <div style={{ height: '100%', width: `${b.pct}%`, background: b.color, borderRadius: 4 }} />
                  </div>
                </div>
              ))}
              <p style={{ fontSize: 12, color: '#334155', marginTop: 12 }}>Instrumentos sugeridos: {perfilData.recomendacion}</p>
            </div>

            <button onClick={guardarYContinuar} disabled={guardando}
              style={{ background: 'linear-gradient(135deg,#059669,#0284c7)', color: '#fff', border: 'none', borderRadius: 14, padding: '14px 40px', fontSize: 15, fontWeight: 800, cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.7 : 1, width: '100%' }}>
              {guardando ? 'Guardando...' : 'Ir a mi dashboard →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ minHeight: '100vh', background: '#0b1120', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, border: '3px solid #0284c7', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
