#!/usr/bin/env python3
"""
TCP Proxy IPv4 -> IPv6 para Supabase
Roda no Windows host, encaminha localhost:5432 -> db.supabase.co:5432 (IPv6)
"""
import socket
import threading
import sys

IPv6_TARGET = "db.agklraytctednncsncbd.supabase.co"
IPv6_PORT = 5432
LISTEN_HOST = "0.0.0.0"
LISTEN_PORT = 5432

def forward(source, destination):
    try:
        while True:
            data = source.recv(8192)
            if not data:
                break
            destination.sendall(data)
    except Exception:
        pass
    finally:
        try:
            source.shutdown(socket.SHUT_RDWR)
        except:
            pass
        try:
            destination.shutdown(socket.SHUT_RDWR)
        except:
            pass

def handle_client(client_sock):
    try:
        # Conecta ao destino IPv6
        server_sock = socket.create_connection((IPv6_TARGET, IPv6_PORT), timeout=10)
        
        # Threads para forwarding bidirecional
        t1 = threading.Thread(target=forward, args=(client_sock, server_sock), daemon=True)
        t2 = threading.Thread(target=forward, args=(server_sock, client_sock), daemon=True)
        t1.start()
        t2.start()
        t1.join()
        t2.join()
    except Exception as e:
        print(f"Erro: {e}")
    finally:
        client_sock.close()

def main():
    print(f"Iniciando proxy TCP {LISTEN_HOST}:{LISTEN_PORT} -> {IPv6_TARGET}:{IPv6_PORT} (IPv6)")
    
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind((LISTEN_HOST, LISTEN_PORT))
    server.listen(50)
    
    print("Proxy rodando. Ctrl+C para parar.")
    
    try:
        while True:
            client, addr = server.accept()
            print(f"Conexão de {addr}")
            threading.Thread(target=handle_client, args=(client,), daemon=True).start()
    except KeyboardInterrupt:
        print("\nParando...")
    finally:
        server.close()

if __name__ == "__main__":
    main()