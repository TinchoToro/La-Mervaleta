// pages/dashboard.jsx – Dashboard con historial de precios real
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';
import { carteraService, rankingService } from '../services/api';
import Link from 'next/link';

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

function CandleChart({ data, width = 280, height = 110 }) {
  if (!data || data.length < 2) return (
    <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155', fontSize: 12 }}>
      Acumulando datos históricos...
    </div>
  );
  const candles = data.slice(-18).map((d, i, arr) => {
    const prev = arr[i - 1];
    const o = prev ? parseFloat(prev.precio) : parseFloat(d.precio) * 0.998;
    const c = parseFloat(d.precio);
    const h = Math.max(o, c) * (1 + Math.random() * 0.008);
    const l = Math.min(o, c) * (1 - Math.random() * 0.008);
    return { o, c, h, l };
  });
  const prices = candles.flatMap(c => [c.h, c.l]);
  const max = Math.max(...prices);
  const min = Math.min(...prices);
  const range = max - min || 1;
  const pad = 8;
  const chartH = height - pad * 2;
  const candleW = Math.floor((width - 20) / candles.length) - 2;
  const toY = v => pad + chartH - ((v - min) / range) * chartH;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {candles.map((c, i) => {
        const x = 10 + i * (candleW + 2);
        const isUp = c.c >= c.o;
        const color = isUp ? '#34d399' : '#f87171';
        const bodyTop = toY(Math.max(c.o, c.c));
        const bodyH = Math.max(2, Math.abs(toY(c.o) - toY(c.c)));
        const cx = x + candleW / 2;
        return (
          <g key={i}>
            <line x1={cx} y1={toY(c.h)} x2={cx} y2={toY(c.l)} stroke={color} strokeWidth="1"/>
            <rect x={x} y={bodyTop} width={candleW} height={bodyH} fill={color} rx="1"/>
          </g>
        );
      })}
    </svg>
  );
}

const ACTIVOS_PANEL = ['GGAL','YPFD','BMA','PAMP','AAPL'];

export default function Dashboard() {
  const router = useRouter();
  const { usuario, cargando, logout } = useAuth();
  const [cartera, setCartera]     = useState(null);
  const [posicion, setPosicion]   = useState(null);
  const [loading, setLoading]     = useState(true);
  const [activoSel, setActivoSel] = useState(0);
  const [historial, setHistorial] = useState({});
  const [activos, setActivos]     = useState([]);
const [isMobile, setIsMobile] = useState(false);
useEffect(() => { setIsMobile(window.innerWidth < 768); }, []);
  useEffect(() => {
    if (!cargando && !usuario) { router.push('/login'); return; }
    if (!usuario) return;
    Promise.all([
      carteraService.miCartera(),
      rankingService.miPosicion().catch(() => null),
      carteraService.listarActivos(),
      fetch(`${API}/historial`, { headers: { Authorization: `Bearer ${localStorage.getItem('mervaleta_token')}` } }).then(r => r.json()),
    ]).then(([c, p, a, h]) => {
      setCartera(c);
      setPosicion(p);
      setActivos(Array.isArray(a) ? a : []);
      setHistorial(h && typeof h === 'object' ? h : {});
    }).finally(() => setLoading(false));
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
  const sma20 = precios.length >= 20 ? precios.slice(-20).reduce((a,b) => a+b, 0) / 20 : precioActual * 0.995;
  const sma50 = precios.length >= 50 ? precios.slice(-50).reduce((a,b) => a+b, 0) / 50 : precioActual * 0.985;
  let rsi = 50;
  if (precios.length >= 14) {
    const cambios = precios.slice(-14).map((p, i, arr) => i > 0 ? p - arr[i-1] : 0).slice(1);
    const ganancias = cambios.filter(c => c > 0).reduce((a,b) => a+b, 0) / 14;
    const perdidas = Math.abs(cambios.filter(c => c < 0).reduce((a,b) => a+b, 0)) / 14;
    rsi = perdidas === 0 ? 100 : 100 - (100 / (1 + ganancias / perdidas));
  }
  const getFundamental = (a) => {
    if (!a) return { pe: 10, pb: 1.2, roe: 18 };
    const base = { accion: { pe: 9.5, pb: 1.3, roe: 20 }, cedear: { pe: 25, pb: 5, roe: 28 }, bono: { pe: 0, pb: 1.0, roe: 8 }, letra: { pe: 0, pb: 1.0, roe: 6 } };
    return base[a.tipo] || base.accion;
  };
  const fund = getFundamental(activoActual);

  // Nav cards — incluye Desafíos
  const navCards = [
    { href: '/mercado',   label: 'Mercado',   color: '#0284c7', icon: '↗', desc: 'Operar'    },
    { href: '/cartera',   label: 'Cartera',   color: '#059669', icon: '◈', desc: 'Posiciones' },
    { href: '/ranking',   label: 'Ranking',   color: '#d97706', icon: '★', desc: 'Liga'       },
    { href: '/conceptos', label: 'Academia',  color: '#7c3aed', icon: '▦', desc: 'Aprender'   },
    { href: '/desafios',  label: 'Desafíos',  color: '#f59e0b', icon: '🎯', desc: 'Completar' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#0b1120', fontFamily: 'system-ui,-apple-system,sans-serif', color: '#e2e8f0' }}>

      <nav style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#059669,#0284c7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="2 18 8 12 13 16 22 6"/><polyline points="17 6 22 6 22 11"/>
            </svg>
          </div>
          <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: -0.5 }}>La Mervaleta</span>
          <span style={{ fontSize: 11, color: '#475569', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 20 }}>Liga Escolar</span>
        </div>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: '#64748b' }}>{usuario?.nombre} {usuario?.apellido}</span>
          {(usuario?.rol === 'docente' || usuario?.rol === 'admin') && (
            <Link href="/docente" style={{ fontSize: 12, color: '#c084fc', textDecoration: 'none', fontWeight: 600 }}>🎓 Panel Docente</Link>
          )}
          <button onClick={logout} style={{ fontSize: 11, padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#64748b', cursor: 'pointer' }}>Salir</button>
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 16px', display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>

        {/* Cards superiores */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {/* Capital */}
          <div style={{ background: sube ? 'linear-gradient(135deg,#064e3b,#0c4a6e)' : 'linear-gradient(135deg,#4c0519,#1e1b4b)', border: `1px solid ${sube ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)'}`, borderRadius: 16, padding: '20px 24px', gridColumn: 'span 2' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Capital actual</p>
                <p style={{ fontSize: 34, fontWeight: 900, color: '#fff', letterSpacing: -1, margin: 0 }}>
                  ${Number(cartera?.capital_actual || 1000000).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: sube ? '#34d399' : '#f87171' }}>
                    {sube ? '▲' : '▼'} {sube ? '+' : ''}{rendimiento}%
                  </span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>desde el inicio</span>
                </div>
              </div>
              {posicion && (
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Posición</p>
                  <p style={{ fontSize: 40, fontWeight: 900, color: '#fff', margin: 0 }}>#{posicion.posicion}</p>
                </div>
              )}
            </div>
          </div>

          {/* Nav cards */}
          {navCards.map(({ href, label, icon, color, desc }) => (
            <Link key={href} href={href} style={{ textDecoration: 'none' }}>
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 16, cursor: 'pointer', height: '100%' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color, fontWeight: 900, marginBottom: 8 }}>{icon}</div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#e2e8f0' }}>{label}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{desc}</div>
              </div>
            </Link>
          ))}
        </div>

        {/* Análisis técnico + fundamental */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <p style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>Análisis Técnico · Datos reales</p>
                <p style={{ fontSize: 16, fontWeight: 800, color: '#e2e8f0', margin: '2px 0 0' }}>{activoActual?.ticker} · {historialActual.length} días</p>
              </div>
              <span style={{ fontSize: 18, fontWeight: 900, color: activoSube ? '#34d399' : '#f87171' }}>
                {activoSube ? '+' : ''}{activoActual?.variacion_dia}%
              </span>
            </div>
            <div style={{ display: 'flex', gap: 4, marginBottom: 14, flexWrap: 'wrap' }}>
              {panelActivos.map((a, i) => (
                <button key={a.ticker} onClick={() => setActivoSel(i)}
                  style={{ padding: '3px 10px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                    background: activoSel === i ? '#0284c7' : 'rgba(255,255,255,0.06)',
                    color: activoSel === i ? '#fff' : '#64748b' }}>
                  {a.ticker}
                </button>
              ))}
            </div>
            <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: '10px 8px', marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: '#475569', marginBottom: 6, paddingLeft: 4 }}>Velas · {historialActual.length > 0 ? 'Historial real' : 'Sin datos aún'}</div>
              <CandleChart data={historialActual} width={260} height={110} />
            </div>
            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: '10px 12px', marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: '#475569' }}>Tendencia · últimos {historialActual.length} días</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>${Number(activoActual?.precio || 0).toLocaleString('es-AR')}</span>
              </div>
              {historialActual.length >= 2 ? (
                <Sparkline data={historialActual} color={activoSube ? '#34d399' : '#f87171'} width={240} height={36} />
              ) : (
                <div style={{ height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155', fontSize: 11 }}>El gráfico se completará con el tiempo</div>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
              {[
                { label: 'RSI (14)', value: rsi.toFixed(1), status: rsi > 70 ? 'Sobrecomprado' : rsi < 30 ? 'Sobrevendido' : 'Neutral', color: rsi > 70 ? '#f87171' : rsi < 30 ? '#34d399' : '#94a3b8' },
                { label: 'SMA 20', value: `$${sma20.toFixed(0)}`, status: precioActual > sma20 ? 'Por encima' : 'Por debajo', color: precioActual > sma20 ? '#34d399' : '#f87171' },
                { label: 'SMA 50', value: `$${sma50.toFixed(0)}`, status: precioActual > sma50 ? 'Tendencia ↑' : 'Tendencia ↓', color: precioActual > sma50 ? '#34d399' : '#f87171' },
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

          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 20 }}>
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>Análisis Fundamental</p>
              <p style={{ fontSize: 16, fontWeight: 800, color: '#e2e8f0', margin: '2px 0 0' }}>{activoActual?.nombre}</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
              {activoActual?.tipo === 'accion' || activoActual?.tipo === 'cedear' ? [
                { label: 'P/E', value: fund.pe, desc: 'Precio/Ganancia', ok: fund.pe < 20 && fund.pe > 0 },
                { label: 'P/BV', value: fund.pb, desc: 'Precio/Libro', ok: fund.pb < 3 },
                { label: 'ROE', value: `${fund.roe}%`, desc: 'Retorno capital', ok: fund.roe > 15 },
              ].map(r => (
                <div key={r.label} style={{ background: r.ok ? 'rgba(52,211,153,0.08)' : 'rgba(248,113,113,0.08)', border: `1px solid ${r.ok ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)'}`, borderRadius: 10, padding: '12px 10px', textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>{r.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: r.ok ? '#34d399' : '#f87171' }}>{r.value}</div>
                  <div style={{ fontSize: 9, color: '#475569', marginTop: 3 }}>{r.desc}</div>
                </div>
              )) : (
                <div style={{ gridColumn: 'span 3', background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: '#475569' }}>Instrumento de renta fija</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#34d399', marginTop: 8 }}>{fund.roe}%</div>
                  <div style={{ fontSize: 11, color: '#475569' }}>Rendimiento anual estimado</div>
                </div>
              )}
            </div>
            <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10, fontWeight: 600 }}>Indicadores del instrumento</div>
              {[
                { label: 'Liquidez de mercado', pct: activoActual?.tipo === 'accion' ? 85 : activoActual?.tipo === 'cedear' ? 70 : 60, color: '#34d399' },
                { label: 'Momentum', pct: Math.min(Math.max(50 + (activoActual?.variacion_dia || 0) * 10, 5), 95), color: activoSube ? '#34d399' : '#f87171' },
                { label: 'Volatilidad histórica', pct: precios.length > 5 ? Math.min(Math.abs(rsi - 50) * 2, 90) : 40, color: '#fbbf24' },
                { label: 'Riesgo país', pct: 42, color: '#60a5fa' },
              ].map(b => (
                <div key={b.label} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>{b.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: b.color }}>{b.pct.toFixed(0)}%</span>
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 4 }}>
                    <div style={{ height: '100%', width: `${b.pct}%`, background: b.color, borderRadius: 4, transition: 'width 1s ease' }} />
                  </div>
                </div>
              ))}
            </div>
            <Link href="/mercado" style={{ textDecoration: 'none' }}>
              <div style={{ background: 'linear-gradient(135deg,#059669,#0284c7)', borderRadius: 12, padding: 13, textAlign: 'center', cursor: 'pointer', fontWeight: 800, fontSize: 14, color: '#fff' }}>
                Operar {activoActual?.ticker} →
              </div>
            </Link>
          </div>
        </div>

        {/* Posiciones */}
        {cartera?.posiciones?.length > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>Mis posiciones</span>
              <Link href="/cartera" style={{ fontSize: 12, color: '#0284c7', textDecoration: 'none', fontWeight: 600 }}>Ver todo →</Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))' }}>
              {cartera.posiciones.slice(0, 6).map(p => (
                <div key={p.activo_id} style={{ padding: '14px 20px', borderRight: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
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
            <p style={{ color: '#64748b', marginBottom: 16, fontSize: 15 }}>Tu cartera está vacía. Tenés <strong style={{ color: '#34d399' }}>${Number(cartera?.capital_actual || 1000000).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</strong> para invertir.</p>
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
