const opciones = [
  ['conceptos_leidos', 'Leer una cantidad de conceptos', 'cantidad'],
  ['todos_conceptos', 'Leer todos los conceptos activos'],
  ['primera_compra', 'Realizar la primera compra'],
  ['total_operaciones', 'Realizar una cantidad de operaciones', 'cantidad'],
  ['diversificacion_activos', 'Tener distintos activos en cartera', 'cantidad'],
  ['diversificacion_sectores', 'Tener distintos sectores en cartera', 'cantidad'],
  ['cedears_en_cartera', 'Tener distintos CEDEAR en cartera', 'cantidad'],
  ['inversor_completo', 'Tener los cuatro tipos de activos'],
  ['renta_fija_pct', 'Alcanzar un porcentaje de renta fija en la cartera invertida', 'pct_minimo'],
  ['superar_promedio_escuela', 'Superar el capital disponible promedio de la escuela'],
  ['consistencia_semanal', 'Participar en distintas semanas del desafío', 'semanas'],
  ['manual', 'Validación docente de una actividad abierta'],
];
export default function SelectorRegla({ value, onChange, style }) {
  const campo = opciones.find(o => o[0] === value.tipo)?.[2];
  return <div>
    <label style={{ display: 'block', marginBottom: 6 }}>Condición para completar el desafío</label>
    <select style={style} value={value.tipo} onChange={e => {
      const nueva = opciones.find(o => o[0] === e.target.value);
      onChange({ tipo: nueva[0], ...(nueva[2] ? { [nueva[2]]: nueva[2] === 'pct_minimo' ? 20 : 5 } : {}) });
    }}>
      {opciones.map(o => <option key={o[0]} value={o[0]}>{o[1]}</option>)}
    </select>
    {value.tipo === 'conceptos_leidos' && <label style={{ display: 'block', marginTop: 8 }}>
      <input type="checkbox" checked={Boolean(value.antes_de_operar)} onChange={e => onChange({ ...value, antes_de_operar: e.target.checked })} /> Leerlos antes de la primera operación
    </label>}
    {campo && <label style={{ display: 'block', marginTop: 8 }}>
      {campo === 'pct_minimo' ? 'Porcentaje mínimo' : campo === 'semanas' ? 'Cantidad de semanas' : 'Cantidad requerida'}
      <input style={style} type="number" min={1} max={campo === 'pct_minimo' ? 100 : undefined} step={campo === 'pct_minimo' ? 'any' : 1}
        value={value[campo]} onChange={e => onChange({ ...value, [campo]: Number(e.target.value) })} />
    </label>}
  </div>;
}
