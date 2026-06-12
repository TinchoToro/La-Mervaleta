"""
actualizar_precios.py
Actualiza precios del mercado y guarda historial diario.
"""
import requests
import psycopg2
from datetime import datetime
import random

DB_URL = "postgresql://postgres:Memu2026@localhost:5432/mervaleta"

def obtener_precios_byma():
    precios = {}
    try:
        url = "https://open.bymadata.com.ar/assets/sql-on/data/leading_securities.json"
        headers = {"User-Agent": "Mozilla/5.0", "Accept": "application/json"}
        r = requests.get(url, headers=headers, timeout=10, verify=False)
        if r.status_code == 200:
            data = r.json()
            for item in data.get("data", []):
                symbol = item.get("s") or item.get("symbol") or item.get("ticker")
                price  = item.get("c") or item.get("price") or item.get("last")
                change = item.get("pct") or item.get("change_pct") or 0
                if symbol and price:
                    precios[symbol] = {"precio": float(price), "variacion": round(float(change), 2)}
        print(f"  Precios obtenidos: {len(precios)} activos")
    except Exception as e:
        print(f"  Error BYMA: {e}")

    if not precios:
        print("  Usando simulacion de mercado...")
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
        cur.execute("SELECT ticker, precio FROM activos WHERE activo = TRUE")
        rows = cur.fetchall()
        cur.close(); conn.close()
        for ticker, precio_base in rows:
            v = round(random.uniform(-3, 3), 2)
            precios[ticker] = {"precio": round(float(precio_base) * (1 + v / 100), 2), "variacion": v}

    return precios

def actualizar_en_db(precios):
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    n = 0
    for ticker, datos in precios.items():
        # Actualizar precio actual
        cur.execute(
            "UPDATE activos SET precio=%s, variacion_dia=%s, updated_at=NOW() WHERE ticker=%s AND activo=TRUE",
            (datos["precio"], datos["variacion"], ticker)
        )
        if cur.rowcount > 0:
            n += 1
            signo = '+' if datos['variacion'] >= 0 else ''
            print(f"  {ticker}: ${datos['precio']:,.2f} ({signo}{datos['variacion']}%)")

        # Guardar en historial (una vez por dia)
        cur.execute(
            """INSERT INTO historial_precios (activo_id, precio, variacion_dia, fecha)
               SELECT id, %s, %s, CURRENT_DATE FROM activos WHERE ticker = %s
               ON CONFLICT (activo_id, fecha) DO UPDATE
               SET precio = EXCLUDED.precio, variacion_dia = EXCLUDED.variacion_dia""",
            (datos["precio"], datos["variacion"], ticker)
        )

    conn.commit(); cur.close(); conn.close()
    return n

print("=" * 50)
print(f"  LA MERVALETA - Precios {datetime.now().strftime('%d/%m/%Y %H:%M')}")
print("=" * 50)
precios = obtener_precios_byma()
n = actualizar_en_db(precios)
print(f"\n  {n} activos actualizados y guardados en historial.")