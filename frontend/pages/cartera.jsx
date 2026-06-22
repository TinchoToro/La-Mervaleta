// pages/cartera.jsx – Cartera con soporte mobile completo
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';
import { carteraService, operacionesService } from '../services/api';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function Cartera() {
  const router = useRouter();
  const { usuario, cargando } = useAuth();
  const [cartera, setCartera]         = useState(null);
  const [historial, setHistorial]     = useState([]);
  const [tab, setTab]                 = useState('posiciones');
  const [loading, setLoading]         = useState(true);
  const [descargando, setDescargando] = useState(false);
  const [descargandoInforme, setDescargandoInforme] = useState(false);
  const [isMobile, setIsMobile]       = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!cargando && !usuario) { router.push('/login'); return; }
    if (!usuario) return;
    Promise.all([carteraService.miCartera(), operacionesService.historial()])
      .then(([c, h]) => { setCartera(c); setHistorial(h); }).finally(() => setLoading(false));
  }, [usuario, cargando]);

  const descargarCertificado = async () => {
    setDescargando(true);
    try {
      const token = localStorage.getItem('mervaleta_token');
      const res = await fetch(`${API}/certificado/descargar`, { headers: { Authorization: `Bearer ${token}` } });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Error al descargar el certificado.');
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `certificado_mervaleta_${usuario.nombre}_${usuario.apellido}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Error al descargar el certificado.');
    } finally {
      setDescargando(false);
    }
  };

  const descargarInforme = async () => {
    setDescargandoInforme(true);
    try {
      const token = localStorage.getItem('mervaleta_token');
      const res = await fetch(`${API}/informe/mi-informe`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Error');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `informe_mervaleta_${usuario.nombre}_${usuario.apellido}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { alert('Error al descargar el informe.'); }
    finally { setDescargandoInforme(false); }
  };

  if (cargando || loading) return <Spinner />;

  const rendimiento = cartera ? parseFloat(cartera.rendimiento_pct) : 0;
  const sube = rendimiento >= 0;

  return (
    <div style={{ minHeight: '100vh', background: '#0b1120', fontFamily: 'system-ui,-apple-system,sans-serif', color: '#e2e8f0' }}>

      {/* Nav */}
      <nav style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Link href="/dashboard" style={{ color: '#475569', textDecoration: 'none', fontSize: 18, flexShrink: 0 }}>←</Link>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#059669,#0284c7)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
          </svg>
        </div>
        <span style={{ fontWeight: 800, fontSize: 15, flexShrink: 0 }}>Mi Cartera</span>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={descargarInforme} disabled={descargandoInforme}
            style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.3)', borderRadius: 10, padding: isMobile ? '7px 10px' : '7px 14px', fontSize: 12, fontWeight: 700, color: '#60a5fa', cursor: descargandoInforme ? 'not-allowed' : 'pointer', opacity: descargandoInforme ? 0.6 : 1, whiteSpace: 'nowrap' }}>
            📄 {isMobile ? '' : (descargandoInforme ? 'Generando...' : 'Mi informe')}
            {isMobile && (descargandoInforme ? '...' : 'Informe')}
          </button>
          <button onClick={descargarCertificado} disabled={descargando}
            style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 10, padding: isMobile ? '7px 10px' : '7px 14px', fontSize: 12, fontWeight: 700, color: '#fbbf24', cursor: descargando ? 'not-allowed' : 'pointer', opacity: descargando ? 0.6 : 1, whiteSpace: 'nowrap' }}>
            🏆 {isMobile ? (descargando ? '...' : 'Certif.') : (descargando ? 'Generando...' : 'Mi certificado')}
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Resumen */}
        {cartera && (
          <div style={{ background: sube ? 'linear-gradient(135deg,#064e3b,#0c4a6e)' : 'linear-gradient(135deg,#4c0519,#1e1b4b)', border: `1px solid ${sube ? 'rgba(52,211,153,0.25)' : 'rgba(248,113,113,0.25)'}`, borderRadius: 18, padding: '20px 16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
              {[
                { label: 'Capital actual', valor: `$${Number(cartera.capital_actual).toLocaleString('es-AR', { maximumFractionDigits: 0 })}` },
                { label: 'Capital inicial', valor: `$${Number(cartera.capital_inicial).toLocaleString('es-AR', { maximumFractionDigits: 0 })}` },
                { label: 'Rendimiento', valor: `${sube ? '+' : ''}${rendimiento}%`, color: sube ? '#34d399' : '#f87171' },
              ].map(s => (
                <div key={s.label}>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</p>
                  <p style={{ fontSize: isMobile ? 18 : 26, fontWeight: 900, color: s.color || '#fff', margin: 0 }}>{s.valor}</p>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(Math.abs(rendimiento) * 3, 100)}%`, background: sube ? '#34d399' : '#f87171', borderRadius: 4 }} />
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 4 }}>
          {[['posiciones','Posiciones'], ['historial','Historial']].map(([val, label]) => (
            <button key={val} onClick={() => setTab(val)}
              style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
                background: tab === val ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: tab === val ? '#f1f5f9' : '#475569' }}>
              {label}
              {val === 'posiciones' && cartera?.posiciones?.length > 0 && (
                <span style={{ marginLeft: 6, background: '#0284c7', color: '#fff', fontSize: 10, padding: '1px 6px', borderRadius: 20 }}>{cartera.posiciones.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Posiciones */}
        {tab === 'posiciones' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {cartera?.posiciones?.length === 0 ? (
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '48px', textAlign: 'center' }}>
                <p style={{ color: '#475569', marginBottom: 16 }}>No tenés posiciones abiertas todavía.</p>
                <Link href="/mercado" style={{ background: 'linear-gradient(135deg,#059669,#0284c7)', color: '#fff', padding: '10px 24px', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 13 }}>
                  Ir al mercado →
                </Link>
              </div>
            ) : cartera?.posiciones?.map(p => (
              <div key={p.activo_id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#059669,#0284c7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, color: '#fff', flexShrink: 0 }}>
                      {p.ticker?.slice(0,2)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: 15, color: '#f1f5f9' }}>{p.ticker}</div>
                      <div style={{ fontSize: 12, color: '#475569' }}>{p.nombre}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 16, fontWeight: 900, color: '#f1f5f9' }}>${Number(p.valor_actual).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: p.ganancia_pct >= 0 ? '#34d399' : '#f87171' }}>{p.ganancia_pct >= 0 ? '+' : ''}{p.ganancia_pct}%</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                  {[['Cantidad', p.cantidad], ['Precio compra', `$${Number(p.precio_promedio).toLocaleString('es-AR', { maximumFractionDigits: 2 })}`], ['Precio actual', `$${Number(p.precio_actual).toLocaleString('es-AR', { maximumFractionDigits: 2 })}`]].map(([l, v]) => (
                    <div key={l} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '8px 10px' }}>
                      <div style={{ fontSize: 10, color: '#334155', marginBottom: 2 }}>{l}</div>
                      <div style={{ fontSize: isMobile ? 11 : 13, fontWeight: 700, color: '#94a3b8' }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Historial */}
        {tab === 'historial' && (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden' }}>
            {historial.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#475569' }}>No realizaste operaciones todavía.</div>
            ) : historial.map((op, i) => (
              <div key={op.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: i < historial.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900, flexShrink: 0,
                    background: op.tipo === 'compra' ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)',
                    color: op.tipo === 'compra' ? '#34d399' : '#f87171' }}>
                    {op.tipo === 'compra' ? '↑' : '↓'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#e2e8f0' }}>{op.tipo === 'compra' ? 'Compra' : 'Venta'} {op.ticker}</div>
                    <div style={{ fontSize: 11, color: '#475569' }}>{op.cantidad} u. · ${Number(op.precio).toLocaleString('es-AR', { maximumFractionDigits: 2 })} c/u</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: op.tipo === 'compra' ? '#f87171' : '#34d399' }}>
                    {op.tipo === 'compra' ? '-' : '+'}${Number(op.total).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                  </div>
                  <div style={{ fontSize: 11, color: '#334155' }}>{new Date(op.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Banner PDF */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
          <div style={{ background: 'linear-gradient(135deg,rgba(96,165,250,0.08),rgba(96,165,250,0.03))', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 16, padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#60a5fa', marginBottom: 4 }}>📄 Informe de performance</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Resumen completo para entregar como trabajo práctico.</div>
            </div>
            <button onClick={descargarInforme} disabled={descargandoInforme}
              style={{ flexShrink: 0, background: '#60a5fa', color: '#0b1120', border: 'none', borderRadius: 10, padding: '9px 16px', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
              {descargandoInforme ? '...' : 'Descargar'}
            </button>
          </div>
          <div style={{ background: 'linear-gradient(135deg,rgba(251,191,36,0.08),rgba(251,191,36,0.03))', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 16, padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24', marginBottom: 4 }}>🏆 Certificado digital</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Certificado con QR de verificación al finalizar la liga.</div>
            </div>
            <button onClick={descargarCertificado} disabled={descargando}
              style={{ flexShrink: 0, background: '#fbbf24', color: '#0b1120', border: 'none', borderRadius: 10, padding: '9px 16px', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
              {descargando ? '...' : 'Descargar'}
            </button>
          </div>
        </div>
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
