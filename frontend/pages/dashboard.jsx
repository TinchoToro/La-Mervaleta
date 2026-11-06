// pages/dashboard.jsx – Dashboard con soporte mobile completo + info de temporada
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';
import { carteraService, rankingService } from '../services/api';
import Link from 'next/link';
import ResumenDesafios from '../components/ResumenDesafios';
import EstadoMercado from '../components/EstadoMercado';
import { indicadores } from '../utils/indicadores.mjs';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

function Sparkline({ data, color, width = 240, height = 36 }) {
  if (!data || data.length < 2) return null;
  const precios = data.map(d => parseFloat(d.precio));
  const max = Math.max(...precios);
  const min = Math.min(...precios);
  const range = max - min || 1;
  const pts = precios.map((v, i) => {
    const x = (i / (precios.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 6) - 3;
    return `${x},${y}`;
  }).join(' ');
  const areaPoints = `0,${height} ${pts} ${width},${height}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id={`g${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#g${color.replace('#','')})`}/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function PriceChart({data,width=280,height=110}) {
  if (!data || data.length<2) return <div style={{height,color:'#94a3b8'}}>Todavía no hay suficientes precios registrados.</div>;
  return <Sparkline data={data} color="#60a5fa" width={width} height={height} />;
}

const ACTIVOS_PANEL = ['GGAL','YPFD','BMA','PAMP','AAPL'];

export default function Dashboard() {
  const router = useRouter();
  const [errorDatos,setErrorDatos] = useState('');
  const { usuario, cargando, logout } = useAuth();
  const [cartera, setCartera]       = useState(null);
  const [posicion, setPosicion]     = useState(null);
  const [loading, setLoading]       = useState(true);
  const [activoSel, setActivoSel]   = useState(0);
  const [historial, setHistorial]   = useState({});
  const [activos, setActivos]       = useState([]);
  const [temporada, setTemporada]   = useState(null);
  const [isMobile, setIsMobile]     = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!cargando && !usuario) { router.push('/login'); return; }
    if (!usuario) return;
    const token = localStorage.getItem('mervaleta_token');
    const headers = { Authorization: `Bearer ${token}` };
    const cargar = () => Promise.all([
      carteraService.miCartera(),
      rankingService.miPosicion().catch(() => null),
      carteraService.listarActivos(),
      fetch(`${API}/historial`, { headers }).then(r => r.json()).catch(() => ({})),
      fetch(`${API}/temporadas/activa`, { headers }).then(r => r.json()).catch(() => null),
    ]).then(([c, p, a, h, t]) => {
      setCartera(c);
      setPosicion(p);
      setActivos(Array.isArray(a) ? a : []);
      setHistorial(h && typeof h === 'object' ? h : {});
      setTemporada(t || null);
    }).then(() => setErrorDatos('')).catch(() => setErrorDatos('No se pudieron actualizar los datos. Se muestra la última información cargada.')).finally(() => setLoading(false));
    cargar();
    const timer = setInterval(cargar,30000);
    return () => clearInterval(timer);
  }, [usuario, cargando]);

  if (cargando || loading) return <Spinner />;

  const rendimiento = cartera ? parseFloat(cartera.rendimiento_pct) : 0;
  const sube = rendimiento >= 0;

  const panelActivos = ACTIVOS_PANEL.map(ticker => activos.find(a => a.ticker === ticker)).filter(Boolean);
  const activoActual = panelActivos[activoSel] || panelActivos[0];
  const historialActual = activoActual ? (historial[activoActual.ticker] || []) : [];
  const activoSube = activoActual?.variacion_dia >= 0;

  const precios = historialActual.map(h => parseFloat(h.precio));
  const precioActual = activoActual ? parseFloat(activoActual.precio) : 0;
  const { sma20, sma50, rsi } = indicadores(precios);
  const formatoMedia = v => v == null ? 'Sin datos suficientes' : `$${v.toFixed(2)}`;

  // Calcular días restantes de temporada
  let diasRestantes = null;
  let pctTemporada = 0;
  if (temporada) {
    const ahora = new Date();
    const inicio = new Date(temporada.fecha_inicio);
    const fin = new Date(temporada.fecha_fin);
    diasRestantes = Math.max(0, Math.ceil((fin - ahora) / (1000 * 60 * 60 * 24)));
    const totalDias = Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24));
    const diasTranscurridos = Math.ceil((ahora - inicio) / (1000 * 60 * 60 * 24));
    pctTemporada = Math.min(100, Math.max(0, Math.round((diasTranscurridos / totalDias) * 100)));
  }

  const navCards = [
    { href: '/mercado',   label: 'Mercado',   color: '#0284c7', icon: '↗', desc: 'Operar'    },
    { href: '/cartera',   label: 'Cartera',   color: '#059669', icon: '◈', desc: 'Posiciones' },
    { href: '/ranking',   label: 'Ranking',   color: '#d97706', icon: '★', desc: 'Liga'       },
    { href: '/conceptos', label: 'Academia',  color: '#7c3aed', icon: '▦', desc: 'Aprender'   },
    { href: '/desafios',  label: 'Desafíos',  color: '#f59e0b', icon: '🎯', desc: 'Completar' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#0b1120', fontFamily: 'system-ui,-apple-system,sans-serif', color: '#e2e8f0' }}>

      {/* NAV */}
      <nav style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#059669,#0284c7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="2 18 8 12 13 16 22 6"/><polyline points="17 6 22 6 22 11"/>
            </svg>
          </div>
          {!isMobile && <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: -0.5 }}>La Mervaleta</span>}
          {!isMobile && <span style={{ fontSize: 11, color: '#475569', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 20 }}>Liga Escolar</span>}
        </div>

        {!isMobile && (
          <div style={{ display: 'flex', gap: 16, fontSize: 11 }}>
            {panelActivos.slice(0,4).map((a,i) => (
              <span key={a.ticker} style={{ cursor: 'pointer' }} onClick={() => setActivoSel(i)}>
                <span style={{ color: '#94a3b8', marginRight: 4 }}>{a.ticker}</span>
                <span style={{ color: a.variacion_dia >= 0 ? '#34d399' : '#f87171', fontWeight: 700 }}>
                  {a.variacion_dia >= 0 ? '+' : ''}{a.variacion_dia}%
                </span>
              </span>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {!isMobile && <span style={{ fontSize: 12, color: '#64748b' }}>{usuario?.nombre} {usuario?.apellido}</span>}
          {(usuario?.rol === 'docente' || usuario?.rol === 'admin') && (
            <Link href="/docente" style={{ fontSize: isMobile ? 13 : 12, color: '#c084fc', textDecoration: 'none', fontWeight: 600 }}>🎓</Link>
          )}
          <button onClick={logout} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#64748b', cursor: 'pointer' }}>Salir</button>
        </div>
      </nav>

      {/* Precios mobile */}
      {isMobile && panelActivos.length > 0 && (
        <div style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '8px 16px', display: 'flex', gap: 14, overflowX: 'auto', fontSize: 11 }}>
          {panelActivos.map((a,i) => (
            <span key={a.ticker} style={{ cursor: 'pointer', flexShrink: 0 }} onClick={() => setActivoSel(i)}>
              <span style={{ color: '#94a3b8', marginRight: 4 }}>{a.ticker}</span>
              <span style={{ color: a.variacion_dia >= 0 ? '#34d399' : '#f87171', fontWeight: 700 }}>
                {a.variacion_dia >= 0 ? '+' : ''}{a.variacion_dia}%
              </span>
            </span>
          ))}
        </div>
      )}

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '16px', display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
        {errorDatos && <p role="alert" style={{color:'#fbbf24'}}>{errorDatos}</p>}
        <EstadoMercado />
        <ResumenDesafios />

        {/* BANNER DE TEMPORADA */}
        {temporada ? (
          <div style={{ background: 'rgba(2,132,199,0.08)', border: '1px solid rgba(2,132,199,0.25)', borderRadius: 14, padding: '14px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>🏆</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: '#f1f5f9' }}>{temporada.nombre}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>
                    {new Date(temporada.fecha_inicio).toLocaleDateString('es-AR')} → {new Date(temporada.fecha_fin).toLocaleDateString('es-AR')}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                {posicion && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: '#60a5fa' }}>#{posicion.posicion}</div>
                    <div style={{ fontSize: 10, color: '#475569' }}>Tu posición</div>
                  </div>
                )}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: diasRestantes === 0 ? '#34d399' : '#fbbf24' }}>
                    {diasRestantes === 0 ? '✓ Fin' : `${diasRestantes}d`}
                  </div>
                  <div style={{ fontSize: 10, color: '#475569' }}>{diasRestantes === 0 ? 'Finalizada' : 'Restantes'}</div>
                </div>
              </div>
            </div>
            {/* Barra de progreso */}
            <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pctTemporada}%`, background: 'linear-gradient(90deg,#0284c7,#059669)', borderRadius: 4, transition: 'width 1s ease' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ fontSize: 10, color: '#334155' }}>{pctTemporada}% completado</span>
              <Link href="/ranking" style={{ fontSize: 11, color: '#0284c7', textDecoration: 'none', fontWeight: 600 }}>Ver ranking →</Link>
            </div>
          </div>
        ) : (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16 }}>📅</span>
            <span style={{ fontSize: 13, color: '#475569' }}>No hay una liga activa en este momento. Tu docente la activará pronto.</span>
          </div>
        )}

        {/* Cards superiores */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {/* Capital */}
          <div style={{ background: sube ? 'linear-gradient(135deg,#064e3b,#0c4a6e)' : 'linear-gradient(135deg,#4c0519,#1e1b4b)', border: `1px solid ${sube ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)'}`, borderRadius: 16, padding: isMobile ? '16px' : '20px 24px', gridColumn: 'span 2' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Patrimonio total</p>
                <p style={{ fontSize: isMobile ? 26 : 34, fontWeight: 900, color: '#fff', letterSpacing: -1, margin: 0 }}>
                  ${Number(cartera?.patrimonio_total ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                  <span style={{ fontSize: isMobile ? 14 : 16, fontWeight: 800, color: sube ? '#34d399' : '#f87171' }}>
                    {sube ? '▲' : '▼'} {sube ? '+' : ''}{rendimiento}%
                  </span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>desde el inicio</span>
                </div>
              </div>
              {posicion && (
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>Posición en liga</p>
                  <p style={{ fontSize: isMobile ? 32 : 40, fontWeight: 900, color: '#fff', margin: 0 }}>#{posicion.posicion}</p>
                </div>
              )}
            </div>
          </div>

          {/* Nav cards */}
          {navCards.map(({ href, label, icon, color, desc }) => (
            <Link key={href} href={href} style={{ textDecoration: 'none' }}>
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: isMobile ? '12px' : 16, cursor: 'pointer', height: '100%' }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color, fontWeight: 900, marginBottom: 6 }}>{icon}</div>
                <div style={{ fontWeight: 700, fontSize: isMobile ? 13 : 14, color: '#e2e8f0' }}>{label}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{desc}</div>
              </div>
            </Link>
          ))}
        </div>

        {/* Análisis técnico + fundamental */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>

          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <p style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>Análisis técnico · Precios con fuente registrada</p>
                <p style={{ fontSize: 15, fontWeight: 800, color: '#e2e8f0', margin: '2px 0 0' }}>{activoActual?.ticker} · {historialActual.length} días</p>
              </div>
              <span style={{ fontSize: 17, fontWeight: 900, color: activoSube ? '#34d399' : '#f87171' }}>
                {activoSube ? '+' : ''}{activoActual?.variacion_dia}%
              </span>
            </div>
            <div style={{ display: 'flex', gap: 4, marginBottom: 12, flexWrap: 'wrap' }}>
              {panelActivos.map((a, i) => (
                <button key={a.ticker} onClick={() => setActivoSel(i)}
                  style={{ padding: '3px 10px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                    background: activoSel === i ? '#0284c7' : 'rgba(255,255,255,0.06)',
                    color: activoSel === i ? '#fff' : '#64748b' }}>
                  {a.ticker}
                </button>
              ))}
            </div>
            <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: '10px 8px', marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: '#475569', marginBottom: 6, paddingLeft: 4 }}>Registro diario · {historialActual.length > 0 ? 'Precios disponibles' : 'Sin datos aún'}</div>
              <PriceChart data={historialActual} width={isMobile ? window.innerWidth - 80 : 260} height={110} />
            </div>
            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: '10px 12px', marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: '#475569' }}>Tendencia · últimos {historialActual.length} días</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>${Number(activoActual?.precio || 0).toLocaleString('es-AR')}</span>
              </div>
              {historialActual.length >= 2 ? (
                <Sparkline data={historialActual} color={activoSube ? '#34d399' : '#f87171'} width={isMobile ? window.innerWidth - 100 : 240} height={36} />
              ) : (
                <div style={{ height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155', fontSize: 11 }}>El gráfico se completará con el tiempo</div>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: 'RSI (14)', value: rsi == null ? 'Sin datos suficientes' : rsi.toFixed(1), status: rsi == null ? 'Se requieren 15 precios' : rsi > 70 ? 'Sobrecomprado' : rsi < 30 ? 'Sobrevendido' : 'Neutral', color: rsi > 70 ? '#f87171' : rsi < 30 ? '#34d399' : '#94a3b8' },
                { label: 'SMA 20', value: formatoMedia(sma20), status: sma20 == null ? 'Se requieren 20 precios' : precioActual > sma20 ? 'Por encima' : 'Por debajo', color: precioActual > sma20 ? '#34d399' : '#f87171' },
                { label: 'SMA 50', value: formatoMedia(sma50), status: sma50 == null ? 'Se requieren 50 precios' : precioActual > sma50 ? 'Tendencia ↑' : 'Tendencia ↓', color: precioActual > sma50 ? '#34d399' : '#f87171' },
                { label: 'Variación hoy', value: `${activoActual?.variacion_dia >= 0 ? '+' : ''}${activoActual?.variacion_dia}%`, status: activoSube ? 'Sube' : 'Baja', color: activoSube ? '#34d399' : '#f87171' },
              ].map(ind => (
                <div key={ind.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 10, color: '#475569', marginBottom: 3 }}>{ind.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#e2e8f0' }}>{ind.value}</div>
                  <div style={{ fontSize: 10, color: ind.color, marginTop: 2 }}>{ind.status}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 18 }}>
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>Análisis Fundamental</p>
              <p style={{ fontSize: 15, fontWeight: 800, color: '#e2e8f0', margin: '2px 0 0' }}>{activoActual?.nombre}</p>
            </div>
            <p style={{color:'#94a3b8',fontSize:13,lineHeight:1.6}}>{activoActual?.descripcion || 'Sin descripción disponible.'}</p>
            <p style={{color:'#94a3b8',fontSize:12}}>P/E, P/BV, ROE y rendimiento de renta fija: sin fuente conectada para estos indicadores.</p>
          </div>
        </div>

        {/* Posiciones */}
        {cartera?.posiciones?.length > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>Mis posiciones</span>
              <Link href="/cartera" style={{ fontSize: 12, color: '#0284c7', textDecoration: 'none', fontWeight: 600 }}>Ver todo →</Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(180px,1fr))' }}>
              {cartera.posiciones.slice(0, 6).map(p => (
                <div key={p.activo_id} style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14, color: '#e2e8f0' }}>{p.ticker}</div>
                      <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{p.cantidad} unidades</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#e2e8f0' }}>${Number(p.valor_actual).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: p.ganancia_pct >= 0 ? '#34d399' : '#f87171' }}>{p.ganancia_pct >= 0 ? '+' : ''}{p.ganancia_pct}%</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {cartera?.posiciones?.length === 0 && (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
            <p style={{ color: '#64748b', marginBottom: 16, fontSize: 15 }}>Tu cartera está vacía. Tenés <strong style={{ color: '#34d399' }}>${Number(cartera?.patrimonio_total ?? 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</strong> para invertir.</p>
            <Link href="/mercado">
              <span style={{ background: 'linear-gradient(135deg,#059669,#0284c7)', color: '#fff', padding: '12px 28px', borderRadius: 12, fontWeight: 800, fontSize: 14, cursor: 'pointer', display: 'inline-block', textDecoration: 'none' }}>
                Ir al mercado →
              </span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ minHeight: '100vh', background: '#0b1120', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 36, height: 36, border: '3px solid #0284c7', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
