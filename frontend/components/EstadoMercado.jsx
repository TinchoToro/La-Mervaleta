import { useEffect, useState } from 'react';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
export default function EstadoMercado() {
  const [estado,setEstado] = useState(null);
  const [error,setError] = useState('');
  useEffect(() => {
    let vigente = true;
    const cargar = async () => {
      try {
        const r = await fetch(`${API}/precios/estado`, { cache:'no-store', headers:{Authorization:`Bearer ${localStorage.getItem('mervaleta_token')}`} });
        if (!r.ok) throw new Error('No se pudo verificar la actualización de precios');
        const d = await r.json();
        if (vigente) { setEstado(d); setError(''); }
      } catch(e) { if(vigente) setError(e.message); }
    };
    cargar();
    const timer=setInterval(cargar,30000);
    return () => { vigente=false; clearInterval(timer); };
  },[]);
  const aviso = error || !estado?.proveedor_configurado || estado?.estado==='error';
  return <aside style={{ padding:14,borderRadius:12,background:aviso?'rgba(251,191,36,.08)':'rgba(96,165,250,.08)',color:'#cbd5e1',fontSize:12 }}>
    {error ? <span role="alert">{error}. Se muestran los últimos datos cargados.</span> : !estado ? 'Verificando cotizaciones…' : !estado.proveedor_configurado ?
      <span>Fuente de mercado sin conectar. Los precios disponibles no tienen actualización automática verificada.</span> : <>
      Fuente: {estado.fuente || 'Esperando primera actualización'} · {estado.activos_con_fuente}/{estado.total_activos} instrumentos con fuente registrada.
      {estado.ultimo_exito && <span> Última consulta exitosa: {new Date(estado.ultimo_exito).toLocaleString('es-AR')}.</span>}
      {estado.estado==='error' && <span role="alert"> La última actualización falló; se conservan los precios anteriores.</span>}
    </>}
    <div style={{marginTop:5}}>Las operaciones son educativas. El porcentaje diario puede permanecer igual cuando no hay una nueva cotización.</div>
  </aside>;
}
