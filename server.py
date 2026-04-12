import http.server
import socketserver
import os
import sys

# Definir puerto por defecto
PORT = 8000

# Asegurar que los tipos MIME para PWA sean correctos
MIME_TYPES = {
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.css': 'text/css',
    '.html': 'text/html',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webmanifest': 'application/manifest+json',
}

class ZenRyuHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Desactivar caché para desarrollo
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def guess_type(self, path):
        base, ext = os.path.splitext(path)
        if ext in MIME_TYPES:
            return MIME_TYPES[ext]
        return super().guess_type(path)

def run_server():
    port = PORT
    handler = ZenRyuHandler
    
    # Intentar encontrar un puerto libre si el 8000 está ocupado
    while True:
        try:
            with socketserver.TCPServer(("", port), handler) as httpd:
                print("\n" + "="*50)
                print("   ⛩️  ZEN RYU SENSEI - SERVIDOR DE PRUEBAS  ⛩️")
                print("="*50)
                print(f"\n🚀 Servidor activo en:")
                print(f"👉 http://localhost:{port}")
                print(f"👉 http://127.0.0.1:{port}")
                print("\n📂 Directorio:", os.getcwd())
                print("🛠️  Caché desactivada para pruebas en tiempo real.")
                print("\nPresiona CTRL+C para detener el servidor.")
                print("="*50 + "\n")
                httpd.serve_forever()
        except OSError as e:
            if e.errno == 48: # Puerto ocupado
                port += 1
                continue
            else:
                print(f"❌ Error al iniciar el servidor: {e}")
                sys.exit(1)
        except KeyboardInterrupt:
            print("\n🛑 Servidor detenido. ¡Sigue entrenando, Guerrero!")
            sys.exit(0)

if __name__ == "__main__":
    run_server()
