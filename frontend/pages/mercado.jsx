// pages/mercado.jsx – Mercado estilo dashboard oscuro con filtros corregidos
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';
import { carteraService, operacionesService } from '../services/api';
import Link from 'next/link';

const TIPO_CONFIG = {
  accion: { label: 'Accion',  color: '#60a5fa', bg: 'rgba(96,165,250,0.1)'  },
  cedear: { label: 'CEDEAR',  color: '#c084fc', bg: 'rgba(192,132,252,0.1)' },
  bono:   { label: 'Bono',    color: '#fbbf24', bg: 'rgba(251,191,36,0.1)'  },
  letra:  { label: 'Letra',   color: '#34d399', bg: 'rgba(52,211,153,0.1)'  },
};

const PANEL_LIDER = ['GGAL','YPFD','BMA','PAMP','BBAR','TECO2','TGSU2','TXAR','CEPU','BYMA'];

const FILTROS = [
  { val: 'panel',  label: '🏛️ Panel Lider' },
  { val: 'todos',  label: 'Todos' },
  { val: 'accion', label: '📈 Acciones' },
  { val: 'cedear', label: '🌎 CEDEARs' },
  { val: 'bono',   label: '🏛️ Bonos' },
  { val: 'letra',  label: '📄 Letras' },
];

export default function Mercado() {
  const router = useRouter();
  const { usuario, cargando } = useAuth();
  const [activos, setActivos]   = useState([]);
  const [cartera, setCartera]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(null);
  const [cantidad, setCantidad] = useState(1);
  const [operando, setOperando] = useState(false);
  const [msg, setMsg]           = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro]     = useState('panel');

  useEffect(() => {
    if (!cargando && !usuario) { router.push('/login'); return; }
    if (!usuario) return;
    Promise.all([
  carteraService.listarActivos(),
  carteraService.miCartera().catch(() => null),
]).then(([a, c]) => { setActivos(a); setCartera(c); }).finally(() => setLoading(false));
  }, [usuario, cargando]);

  const posicionDe = id => cartera?.posiciones?.find(p => p.activo_id === id);

  const activosFiltrados = activos.filter(a => {
    const matchB = a.ticker.includes(busqueda.toUpperCase()) || 
                   a.nombre.toLowerCase().includes(busqueda.toLowerCase());
    if (!matchB) return false;
    if (filtro === 'panel') return PANEL_LIDER.includes(a.ticker);
    if (filtro === 'todos') return true;
    if (filtro === 'accion') return a.tipo === 'accion';
    if (filtro === 'cedear') return a.tipo === 'cedear';
    if (filtro === 'bono') return a.tipo === 'bono';
    if (filtro === 'letra') return a.tipo === 'letra';
    return true;
  }).sort((a, b) => {
    if (filtro === 'panel') return PANEL_LIDER.indexOf(a.ticker) - PANEL_LIDER.indexOf(b.ticker);
    return 0;
  });

  const abrirModal = (activo, tipo) => { setModal({ activo, tipo }); setCantidad(1); setMsg(null); };

  const confirmar = async () => {
    if (!modal || cantidad <= 0) return;
    setOperando(true); setMsg(null);
    try {
      let res;
      if (modal.tipo === 'compra') res = await operacionesService.comprar(modal.activo.id, Number(cantidad));
      else res = await operacionesService.vender(modal.activo.id, Number(cantidad));
      setMsg({ tipo: 'ok', texto: res.mensaje });
      const c = await carteraService.miCartera();
      setCartera(c);
      setTimeout(() => { setModal(null); setMsg(null); }, 1800);
    } catch (err) {
      setMsg({ tipo: err.message.includes('concepto') ? 'concepto' : 'error', texto: err.message });
    } finally { setOperando(false); }
  };

  if (cargando || loading) return <Spinner />;

  const capital = Number(cartera?.capital_actual || 0);
  const totalModal = modal ? modal.activo.precio * cantidad : 0;

  return (
    <div style={{ minHeight: '100vh', background: '#0b1120', fontFamily: 'system-ui,-apple-system,sans-serif', color: '#e2e8f0' }}>

      {/* Nav */}
      <nav style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/dashboard" style={{ color: '#475569', textDecoration: 'none', fontSize: 18, lineHeight: 1 }}>←</Link>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#059669,#0284c7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="2 18 8 12 13 16 22 6"/><polyline points="17 6 22 6 22 11"/>
          </svg>
        </div>
        <span style={{ fontWeight: 800, fontSize: 15 }}>Mercado</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#64748b' }}>
          Disponible: <span style={{ color: '#34d399', fontWeight: 700 }}>${capital.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
        </span>
      </nav>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Buscador */}
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por ticker o nombre..."
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#e2e8f0', outline: 'none', width: '100%', boxSizing: 'border-box' }} />

        {/* Filtros */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
          {FILTROS.map(({ val, label }) => (
            <button key={val} onClick={() => setFiltro(val)}
              style={{ flexShrink: 0, padding: '7px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, transition: 'all .15s',
                background: filtro === val ? '#0284c7' : 'rgba(255,255,255,0.06)',
                color: filtro === val ? '#fff' : '#64748b' }}>
              {label}
              {val !== 'panel' && val !== 'todos' && (
                <span style={{ marginLeft: 4, opacity: 0.7, fontSize: 10 }}>
                  
                  ({activos.filter(a => a.tipo === val).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Contador */}
        <div style={{ fontSize: 12, color: '#334155' }}>
          {activosFiltrados.length} instrumentos {filtro !== 'todos' && filtro !== 'panel' ? `· ${FILTROS.find(f=>f.val===filtro)?.label}` : ''}
        </div>

        {/* Lista */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {activosFiltrados.length === 0 && (
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '40px', textAlign: 'center', color: '#475569' }}>
              No hay instrumentos con ese filtro.
            </div>
          )}
          {activosFiltrados.map((activo, i) => {
            const pos = posicionDe(activo.id);
            const sube = activo.variacion_dia >= 0;
            const cfg = TIPO_CONFIG[activo.tipo] || TIPO_CONFIG.accion;
            return (
              <div key={activo.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {filtro === 'panel' && (
                        <span style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(255,255,255,0.08)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#60a5fa', flexShrink: 0 }}>{i+1}</span>
                      )}
                      <span style={{ fontWeight: 900, fontSize: 16, color: '#f1f5f9' }}>{activo.ticker}</span>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: cfg.bg, color: cfg.color, fontWeight: 700 }}>{cfg.label}</span>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 700,
                        background: sube ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)',
                        color: sube ? '#34d399' : '#f87171' }}>
                        {sube ? '▲' : '▼'} {sube ? '+' : ''}{activo.variacion_dia}%
                      </span>
                      {pos && <span style={{ fontSize: 11, color: '#60a5fa', background: 'rgba(96,165,250,0.1)', padding: '2px 8px', borderRadius: 20 }}>Tenes {pos.cantidad}</span>}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{activo.nombre}</div>
                    {activo.sector && <div style={{ fontSize: 11, color: '#334155', marginTop: 2, textTransform: 'capitalize' }}>{activo.sector}</div>}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#f1f5f9' }}>${Number(activo.precio).toLocaleString('es-AR', { maximumFractionDigits: 2 })}</div>
                  </div>
                </div>

                {activo.descripcion && (
                  <details style={{ marginBottom: 12 }}>
                    <summary style={{ fontSize: 12, color: '#0284c7', cursor: 'pointer', listStyle: 'none' }}>
                      📖 ¿Que es este instrumento?
                    </summary>
                    <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6, marginTop: 8, padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
                      {activo.descripcion}
                    </p>
                  </details>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => abrirModal(activo, 'compra')}
                    style={{ flex: 1, background: 'linear-gradient(135deg,#059669,#0284c7)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    Comprar
                  </button>
                  {pos && pos.cantidad > 0 && (
                    <button onClick={() => abrirModal(activo, 'venta')}
                      style={{ flex: 1, background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 10, padding: '10px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                      Vender
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div style={{ background: '#131c2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, width: '100%', maxWidth: 400, padding: 24 }}>
            <h3 style={{ color: '#f1f5f9', fontWeight: 800, margin: '0 0 4px', fontSize: 18 }}>
              {modal.tipo === 'compra' ? 'Comprar' : 'Vender'} {modal.activo.ticker}
            </h3>
            <p style={{ fontSize: 12, color: '#475569', marginBottom: 20 }}>{modal.activo.nombre}</p>

            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '12px 14px', marginBottom: 16 }}>
              {[
                ['Precio actual', `$${Number(modal.activo.precio).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`],
                modal.tipo === 'compra' ? ['Capital disponible', `$${capital.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`] : ['Unidades disponibles', posicionDe(modal.activo.id)?.cantidad || 0],
              ].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                  <span style={{ color: '#64748b' }}>{l}</span>
                  <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 6 }}>Cantidad</label>
              <input type="number" min="1" value={cantidad} onChange={e => setCantidad(e.target.value)}
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '12px', fontSize: 20, fontWeight: 800, color: '#f1f5f9', outline: 'none', width: '100%', textAlign: 'center', boxSizing: 'border-box' }} />
            </div>

            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: '#64748b' }}>Total operacion:</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: totalModal > capital && modal.tipo === 'compra' ? '#f87171' : '#f1f5f9' }}>
                ${totalModal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {msg && (
              <div style={{ borderRadius: 10, padding: '10px 12px', marginBottom: 14, fontSize: 13,
                background: msg.tipo === 'ok' ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
                border: `1px solid ${msg.tipo === 'ok' ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)'}`,
                color: msg.tipo === 'ok' ? '#34d399' : '#f87171' }}>
                {msg.texto}
                {msg.tipo === 'concepto' && <Link href="/conceptos" style={{ display: 'block', marginTop: 4, color: '#60a5fa', fontWeight: 700 }}>Ir a la Academia →</Link>}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setModal(null)} disabled={operando}
                style={{ flex: 1, background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '12px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={confirmar} disabled={operando || cantidad <= 0}
                style={{ flex: 1, background: modal.tipo === 'compra' ? 'linear-gradient(135deg,#059669,#0284c7)' : 'linear-gradient(135deg,#dc2626,#b91c1c)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontSize: 13, fontWeight: 800, cursor: operando ? 'not-allowed' : 'pointer', opacity: operando ? 0.6 : 1 }}>
                {operando ? 'Procesando...' : `Confirmar ${modal.tipo}`}
              </button>
            </div>
          </div>
        </div>
      )}
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
