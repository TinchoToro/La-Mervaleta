// pages/login.jsx – Landing con marketing + login/registro
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';
import { escuelasService } from '../services/api';

export default function Login() {
  const router = useRouter();
  const { usuario, cargando, login, register } = useAuth();
  const [modo, setModo]       = useState('login');
  const [escuelas, setEscuelas] = useState([]);
  const [form, setForm]       = useState({ nombre: '', apellido: '', email: '', password: '', escuela_id: '', anio_cursada: '', rol: 'alumno' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!cargando && usuario) {
if (usuario.rol === 'docente' || usuario.rol === 'admin') {
        router.replace('/docente');
      } else if (!usuario.perfil_completado) {
        router.replace('/perfil');
      } else {
        router.replace('/dashboard');
      }
     
    }
  }, [usuario, cargando]);

  useEffect(() => {
    escuelasService.listar().then(setEscuelas).catch(() => {});
  }, []);

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    setError(''); setLoading(true);
    try {
      if (modo === 'login') {
        await login(form.email, form.password);
      } else {
        if (!form.nombre || !form.apellido || !form.email || !form.password || !form.escuela_id) {
          setError('Completá todos los campos obligatorios'); setLoading(false); return;
        }
        await register(form);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = { width: '100%', border: '1px solid #e2e8f0', borderRadius: 10, padding: '11px 14px', fontSize: 13, color: '#0f172a', background: '#f8fafc', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui,-apple-system,sans-serif', display: 'flex', flexDirection: 'column' }}>

      {/* Ticker tape */}
      <div style={{ background: '#0f172a', padding: '6px 0', overflow: 'hidden', whiteSpace: 'nowrap' }}>
        <div style={{ display: 'inline-flex', gap: 32, animation: 'ticker 30s linear infinite', paddingLeft: '100%' }}>
          {['GGAL +2.4%','YPFD -1.2%','BMA +3.1%','PAMP +0.8%','TSLA +1.9%','AAPL -0.5%','AL30 +0.6%','TXAR -2.1%','BBAR +1.4%','CEPU +0.3%','BYMA +1.1%','TGSU2 -0.8%','GD35 +0.4%'].map((t, i) => {
            const up = t.includes('+');
            const [ticker, val] = t.split(' ');
            return (
              <span key={i} style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 11 }}>
                <span style={{ color: '#e2e8f0', fontWeight: 700 }}>{ticker}</span>
                <span style={{ color: up ? '#34d399' : '#f87171', fontWeight: 600 }}>{val}</span>
              </span>
            );
          })}
        </div>
        <style>{`@keyframes ticker { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>
      </div>

      {/* Nav */}
      <nav style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Logo SVG Mervaleta */}
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #059669, #0284c7)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="2 18 8 12 13 16 22 6"/>
              <polyline points="17 6 22 6 22 11"/>
            </svg>
          </div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 17, color: '#0f172a', letterSpacing: -0.8, lineHeight: 1 }}>La Mervaleta</div>
            <div style={{ fontSize: 10, color: '#64748b', letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 }}>Liga Escolar de Inversión</div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: '#64748b', textAlign: 'right' }}>
          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 13 }}>Lic. Martin Acuña</div>
          <div style={{ fontSize: 11 }}>Proyecto Educativo · Chubut</div>
        </div>
      </nav>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 16px', gap: 28 }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', maxWidth: 580 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 20, padding: '5px 14px', fontSize: 12, color: '#15803d', fontWeight: 700, marginBottom: 18 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
            Proyecto Educativo · Mercado de Capitales
          </div>

          <h1 style={{ fontSize: 36, fontWeight: 900, color: '#0f172a', margin: '0 0 14px', lineHeight: 1.1, letterSpacing: -1.5 }}>
            Aprendé invirtiendo<br/>
            <span style={{ background: 'linear-gradient(90deg, #059669, #0284c7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              en el mercado real
            </span>
          </h1>

          <p style={{ fontSize: 15, color: '#475569', margin: '0 0 20px', lineHeight: 1.7, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
            Compra y vende acciones del Merval, CEDEARs y bonos con <strong style={{ color: '#059669' }}>$1.000.000 simulados</strong>. Competencia interescolar diseñada para aprender finanzas de verdad.
          </p>

          {/* Stats */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 20 }}>
         
            
          {[['14', 'Acciones Merval'], ['6', 'CEDEARs globales'], ['9', 'Bonos y letras']].map(([n, l]) => (
              <div key={l} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#0f172a' }}>{n}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>

          {/* Badges */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {[
              { label: 'Panel Líder BYMA', color: '#0284c7', bg: '#eff6ff' },
              { label: 'CEDEARs globales', color: '#7c3aed', bg: '#faf5ff' },
              { label: 'Bonos soberanos', color: '#d97706', bg: '#fffbeb' },
              { label: 'LECAPs', color: '#059669', bg: '#f0fdf4' },
              { label: 'Módulo educativo', color: '#dc2626', bg: '#fef2f2' },
            ].map(b => (
              <span key={b.label} style={{ background: b.bg, color: b.color, border: `1px solid ${b.color}40`, borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600 }}>
                {b.label}
              </span>
            ))}
          </div>
        </div>

        {/* Formulario */}
        <div style={{ width: '100%', maxWidth: 400, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: 28, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>

          {/* Tabs */}
          <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 12, padding: 4, marginBottom: 22 }}>
            {[['login','Ingresar'], ['registro','Registrarse']].map(([m, l]) => (
              <button key={m} onClick={() => { setModo(m); setError(''); }}
                style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, transition: 'all .15s',
                  background: modo === m ? '#fff' : 'transparent',
                  color: modo === m ? '#0f172a' : '#94a3b8',
                  boxShadow: modo === m ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
                {l}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {modo === 'registro' && (
              <>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input placeholder="Nombre *" value={form.nombre} onChange={e => f('nombre', e.target.value)} style={inputStyle} />
                  <input placeholder="Apellido *" value={form.apellido} onChange={e => f('apellido', e.target.value)} style={inputStyle} />
                </div>
                <select value={form.rol} onChange={e => f('rol', e.target.value)} style={inputStyle}>
                  <option value="alumno">Alumno</option>
                  <option value="docente">Docente</option>
                </select>
                <select value={form.escuela_id} onChange={e => f('escuela_id', e.target.value)} style={inputStyle}>
                  <option value="">Seleccionar escuela *</option>
                  {escuelas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
                {form.rol === 'alumno' && (
                  <select value={form.anio_cursada} onChange={e => f('anio_cursada', e.target.value)} style={inputStyle}>
                    <option value="">Año de cursada</option>
                    {['4to','5to','6to','7mo'].map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                )}
              </>
            )}

            <input type="email" placeholder="Email *" value={form.email} onChange={e => f('email', e.target.value)} style={inputStyle} />
            <input type="password" placeholder="Contraseña *" value={form.password} onChange={e => f('password', e.target.value)} style={inputStyle} />

            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: '#dc2626' }}>
                {error}
              </div>
            )}

            <button onClick={submit} disabled={loading}
              style={{ background: 'linear-gradient(135deg, #059669, #0284c7)', color: '#fff', border: 'none', borderRadius: 12, padding: '13px 0', fontSize: 14, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: 4, letterSpacing: 0.3 }}>
              {loading ? 'Procesando...' : modo === 'login' ? 'Ingresar →' : 'Crear cuenta →'}
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'center', fontSize: 11, color: '#cbd5e1' }}>
          Capital inicial simulado: $1.000.000 · Solo uso educativo · Puerto Madryn, Patagonia 🐳
        </div>
      </div>
    </div>
  );
}
