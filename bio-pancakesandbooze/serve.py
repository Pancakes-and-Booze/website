import http.server, socketserver, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
with socketserver.TCPServer(('', 8743), http.server.SimpleHTTPRequestHandler) as s:
    s.serve_forever()
