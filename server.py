"""Runs Drum Coach on this computer.

    python server.py           the app on http://localhost:8765
    python server.py --phone   also a secure https link for your phone (a free Cloudflare quick tunnel)

Progress is saved in drumcoach-progress.json next to this file, so it carries over between
this computer, your phone and each new phone link.
"""
import http.server
import json
import os
import re
import subprocess
import sys
import threading
import webbrowser

PORT = 8765
ROOT = os.path.dirname(os.path.abspath(__file__))
SAVE = os.path.join(ROOT, 'drumcoach-progress.json')
CLOUDFLARED = os.path.join(ROOT, 'tools', 'cloudflared.exe' if os.name == 'nt' else 'cloudflared')
LOCAL = f'http://localhost:{PORT}'

lock = threading.Lock()
phone = {'url': None, 'starting': False}


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
                      '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css'}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def do_GET(self):
        path = self.path.split('?')[0]
        if path == '/api/progress':
            with lock:
                body = open(SAVE, 'rb').read() if os.path.exists(SAVE) else b'null'
            return self.reply(200, body)
        if path == '/api/phone':
            return self.reply(200, json.dumps(phone).encode())
        # Only the app itself is served, since the phone link is open to the internet.
        if path in ('/', '/index.html') or re.fullmatch(r'/(css|js)/[\w.-]+', path):
            return super().do_GET()
        self.reply(404, b'null')

    def do_HEAD(self):
        self.reply(405, b'')

    def do_PUT(self):
        if self.path.split('?')[0] != '/api/progress':
            return self.reply(404, b'null')
        size = int(self.headers.get('Content-Length') or 0)
        if not 0 < size <= 2_000_000:
            return self.reply(413, b'null')
        body = self.rfile.read(size)
        try:
            if not isinstance(json.loads(body), dict):
                raise ValueError
        except ValueError:
            return self.reply(400, b'null')
        with lock:
            with open(SAVE + '.tmp', 'wb') as f:
                f.write(body)
            os.replace(SAVE + '.tmp', SAVE)
        self.reply(204, b'')

    def reply(self, code, body):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass


def start_tunnel():
    if not os.path.exists(CLOUDFLARED):
        print('The phone link needs tools/cloudflared.exe, which is missing.')
        return None
    proc = subprocess.Popen([CLOUDFLARED, 'tunnel', '--no-autoupdate', '--url', LOCAL],
                            stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True, errors='replace')
    phone['starting'] = True

    def watch():
        for line in proc.stderr:  # keep reading so cloudflared never blocks on a full pipe
            found = re.search(r'https://(?!api\.)[a-z0-9-]+\.trycloudflare\.com', line)  # not cloudflared's own api address
            if found and not phone['url']:
                phone.update(url=found.group(0), starting=False)
                print(f'\n  Phone link:  {phone["url"]}\n')
                print('  Scan the QR code on the Setup page, or type the link into your phone.')
                print('  Keep this window open while you play. Close it to stop.\n')
                if '--no-browser' not in sys.argv:
                    webbrowser.open(LOCAL + '/#/setup')
        # cloudflared has stopped, so the link no longer works.
        print('The phone link has stopped.' if phone['url'] else
              "Couldn't start the phone link. Check this computer is online, then try again.")
        phone.update(url=None, starting=False)
    threading.Thread(target=watch, daemon=True).start()
    return proc


def main():
    try:
        server = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), Handler)
    except OSError:
        sys.exit(f'Port {PORT} is busy, so Drum Coach is probably already running. Close its window and try again.')
    print(f'Drum Coach is running on this computer: {LOCAL}')
    tunnel = None
    if '--phone' in sys.argv:
        print('Starting your phone link (this takes a few seconds)...')
        tunnel = start_tunnel()
    else:
        if '--no-browser' not in sys.argv:
            webbrowser.open(LOCAL)
        print('Close this window to stop.')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        if tunnel:
            tunnel.terminate()


if __name__ == '__main__':
    main()
