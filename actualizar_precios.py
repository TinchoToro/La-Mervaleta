"""Dispara el actualizador del backend. No contiene credenciales ni inventa cotizaciones.

Variables: API_BASE_URL (HTTPS, termina en /api) y CRON_SECRET.
El backend debe tener MARKET_DATA_URL y MARKET_DATA_SOURCE configurados.
"""
import json
import os
import urllib.request

def main():
    base = os.environ['API_BASE_URL'].rstrip('/')
    if not base.startswith('https://'):
        raise ValueError('API_BASE_URL debe usar HTTPS')
    request = urllib.request.Request(base + '/precios/actualizar', method='POST',
        headers={'Authorization': 'Bearer ' + os.environ['CRON_SECRET']})
    with urllib.request.urlopen(request, timeout=30) as response:
        print(json.dumps(json.load(response), ensure_ascii=False, indent=2))

if __name__ == '__main__':
    main()
