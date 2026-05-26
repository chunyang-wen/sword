# flask_app.py
import os
import sys
from flask import Flask, request, jsonify
from flask_cors import CORS
from OpenSSL import SSL
import socket
import OpenSSL.crypto
from urllib.parse import urlparse

app = Flask(__name__)
CORS(app)  # Enable CORS for all origins

def parse_target(value, fallback_port):
    input_val = value.strip()
    if not input_val:
        raise ValueError("Enter a hostname or URL.")

    if "://" not in input_val:
        url = urlparse(f"https://{input_val}")
    else:
        url = urlparse(input_val)

    if not url.hostname:
        raise ValueError("Enter a valid hostname or URL.")

    port = fallback_port
    if url.port:
        port = url.port

    return url.hostname, port

def get_tunnelled_socket(host, port):
    # Check if PythonAnywhere HTTP proxy environment variable is present
    proxy_env = os.environ.get('http_proxy') or os.environ.get('HTTP_PROXY')
    
    if proxy_env:
        # Parse proxy details (e.g., http://proxy.server:3128)
        proxy_url = urlparse(proxy_env)
        proxy_host = proxy_url.hostname
        proxy_port = proxy_url.port or 3128
        
        # Connect to the PythonAnywhere proxy
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(10.0)
        sock.connect((proxy_host, proxy_port))
        
        # Establish an HTTP CONNECT tunnel to the target host and port
        connect_req = f"CONNECT {host}:{port} HTTP/1.1\r\nHost: {host}:{port}\r\n\r\n"
        sock.sendall(connect_req.encode('utf-8'))
        
        # Read the proxy response headers
        response = b""
        while b"\r\n\r\n" not in response:
            chunk = sock.recv(4096)
            if not chunk:
                break
            response += chunk
            
        # Verify the tunnel was successfully established (HTTP 200)
        if not response.startswith(b"HTTP/1.1 200") and not response.startswith(b"HTTP/1.0 200"):
            status_line = response.split(b'\r\n')[0].decode('utf-8')
            raise RuntimeError(f"Proxy tunnel failed: {status_line}")
            
        return sock
    else:
        # No proxy (e.g., local testing or paid PythonAnywhere tier) -> connect directly
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(10.0)
        sock.connect((host, port))
        return sock

def get_certificate_chain(host, port):
    context = SSL.Context(SSL.TLS_CLIENT_METHOD)
    context.set_verify(SSL.VERIFY_NONE, lambda *args: True) # Disable verification so we can retrieve any certificate chain
    
    # Get either a direct socket or a proxy-tunnelled socket
    sock = get_tunnelled_socket(host, port)

    ssl_sock = SSL.Connection(context, sock)
    ssl_sock.set_connect_state()  # Tells OpenSSL we are the client
    ssl_sock.set_tlsext_host_name(host.encode('utf-8'))

    try:
        import select
        while True:
            try:
                ssl_sock.do_handshake()
                break
            except SSL.WantReadError:
                readable, _, _ = select.select([sock], [], [], 10.0)
                if not readable:
                    raise socket.timeout("TLS handshake timed out (WantRead)")
            except SSL.WantWriteError:
                _, writable, _ = select.select([], [sock], [], 10.0)
                if not writable:
                    raise socket.timeout("TLS handshake timed out (WantWrite)")
                    
        chain = ssl_sock.get_peer_cert_chain()
        if not chain:
            return []
        certs = []
        for cert in chain:
            pem = OpenSSL.crypto.dump_certificate(OpenSSL.crypto.FILETYPE_PEM, cert)
            certs.append(pem.decode('utf-8'))
        return certs
    finally:
        ssl_sock.close()

@app.route('/api/certificate', methods=['GET'])
def get_certificate():
    target = request.args.get('target', '')
    port_val = request.args.get('port', '443')

    try:
        try:
            port = int(port_val)
        except ValueError:
            port = 443

        host, port = parse_target(target, port)
        certificates = get_certificate_chain(host, port)

        return jsonify({
            "host": host,
            "port": port,
            "certificates": certificates
        })
    except Exception as e:
        error_msg = str(e) or repr(e)
        return jsonify({"error": error_msg}), 400

if __name__ == '__main__':
    app.run(port=5000)
