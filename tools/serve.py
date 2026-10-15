"""Local preview server for the site. Like `python -m http.server`, with three differences:
caching is off so every reload shows the latest code, the response headers in _headers are applied
the way Cloudflare Pages applies them (so the Content-Security-Policy is exercised locally), and missing pages get 404.html.
usage: python3 tools/serve.py [port]   (serves the project root)
"""
import http.server, os, sys

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(root)


def load_rules(path='_headers'):
    """Parse the _headers format: a path pattern, then indented 'Name: value' lines ('! Name' removes a default)."""
    rules, current = [], None
    try:
        lines = open(path, encoding='utf-8').read().splitlines()
    except OSError:
        return rules
    for line in lines:
        if not line.strip() or line.lstrip().startswith('#'):
            continue
        if not line[0].isspace():
            current = (line.strip(), [])
            rules.append(current)
        elif current and ':' in line:
            name, value = line.strip().split(':', 1)
            current[1].append((name.strip(), value.strip()))
    return rules


def matches(pattern, path):
    return path.startswith(pattern[:-1]) if pattern.endswith('*') else path == pattern


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
                      '.js': 'text/javascript', '.mjs': 'text/javascript', '.webp': 'image/webp', '.svg': 'image/svg+xml'}

    def end_headers(self):
        path = self.path.split('?', 1)[0].split('#', 1)[0]
        for pattern, headers in load_rules():
            if matches(pattern, path):
                for name, value in headers:
                    if name.lower() != 'cache-control':
                        self.send_header(name, value)
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        super().end_headers()

    def send_error(self, code, message=None, explain=None):
        if code == 404 and os.path.exists('404.html'):
            body = open('404.html', 'rb').read()
            self.send_response(404)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            if self.command != 'HEAD':
                self.wfile.write(body)
            return
        super().send_error(code, message, explain)

    def log_message(self, *a):
        pass


port = int(sys.argv[1]) if len(sys.argv) > 1 else 8642
http.server.ThreadingHTTPServer(('', port), Handler).serve_forever()
