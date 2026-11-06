export function indicadores(precios) {
  const valores = precios.map(Number).filter(Number.isFinite);
  const media = n => valores.length >= n ? valores.slice(-n).reduce((s,v)=>s+v,0)/n : null;
  let rsi = null;
  if(valores.length >= 15) {
    let ganancia=0,perdida=0;
    for(let i=1;i<=14;i++) { const cambio=valores[i]-valores[i-1]; ganancia+=Math.max(cambio,0)/14; perdida+=Math.max(-cambio,0)/14; }
    for(let i=15;i<valores.length;i++) { const cambio=valores[i]-valores[i-1]; ganancia=(ganancia*13+Math.max(cambio,0))/14; perdida=(perdida*13+Math.max(-cambio,0))/14; }
    rsi=ganancia===0 && perdida===0 ? 50 : perdida===0 ? 100 : 100-100/(1+ganancia/perdida);
  }
  return {sma20:media(20),sma50:media(50),rsi};
}
