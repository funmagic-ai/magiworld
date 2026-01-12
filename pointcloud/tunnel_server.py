import asyncio
import json
import hashlib
import hmac
import uuid
import time
from typing import Dict, Optional
import argparse

class UDPTunnelServer:
    def __init__(self, host: str, port: int, secret_key: str, http_port: int = 8080):
        self.host = host
        self.port = port
        self.http_port = http_port
        self.secret_key = secret_key.encode('utf-8')
        self.clients: Dict[str, tuple] = {}  # client_id -> (address, last_seen)
        self.pending_requests: Dict[str, dict] = {}  # request_id -> response_handler
        
    def verify_signature(self, data: bytes, signature: str) -> bool:
        """验证数据签名"""
        expected_signature = hmac.new(
            self.secret_key, 
            data, 
            hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(signature, expected_signature)
    
    def create_signature(self, data: bytes) -> str:
        """为数据创建签名"""
        return hmac.new(
            self.secret_key, 
            data, 
            hashlib.sha256
        ).hexdigest()
    
    async def handle_request(self, reader, writer):
        """处理来自Web客户端的HTTP请求"""
        try:
            # 读取HTTP请求头
            headers_data = await reader.readuntil(b'\r\n\r\n')
            headers_str = headers_data.decode('utf-8', errors='ignore')
            
            # 解析Content-Length
            content_length = 0
            for line in headers_str.split('\r\n'):
                if line.lower().startswith('content-length:'):
                    content_length = int(line.split(':', 1)[1].strip())
                    break
            
            print(f"请求Content-Length: {content_length}")
            
            # 读取请求体
            body_data = b''
            if content_length > 0:
                # 分块读取大文件
                remaining = content_length
                while remaining > 0:
                    chunk_size = min(8192, remaining)
                    chunk = await reader.read(chunk_size)
                    if not chunk:
                        break
                    body_data += chunk
                    remaining -= len(chunk)
            
            print(f"实际读取到的请求体大小: {len(body_data)} 字节")
            
            # 组合完整的请求数据
            full_request_data = headers_data + body_data
            
            # 解析请求信息
            request_data = {
                'id': str(uuid.uuid4()),
                'timestamp': time.time(),
                'data': full_request_data.decode('utf-8', errors='surrogateescape'),
                'client_addr': writer.get_extra_info('peername')
            }
            
            # 将请求转发给本地客户端
            await self.forward_to_client(request_data, writer)
            
        except Exception as e:
            print(f"处理请求时出错: {e}")
            import traceback
            traceback.print_exc()
            writer.close()
    
    async def forward_to_client(self, request_data: dict, web_writer):
        """将请求转发给本地客户端"""
        try:
            # 序列化请求数据
            json_data = json.dumps(request_data).encode('utf-8')
            print(f"序列化请求数据大小: {len(json_data)} 字节")
            
            # 创建签名
            signature = self.create_signature(json_data)
            
            # 构造UDP包 (signature_length(4) + signature + data)
            signature_bytes = signature.encode('utf-8')
            packet = len(signature_bytes).to_bytes(4, byteorder='big') + signature_bytes + json_data
            
            print(f"构造UDP包大小: {len(packet)} 字节")
            
            # 检查包大小，如果太大则需要分片
            MAX_UDP_PACKET_SIZE = 65507  # UDP最大包大小
            if len(packet) > MAX_UDP_PACKET_SIZE:
                print(f"警告: 数据包过大 ({len(packet)} 字节)，可能无法通过UDP传输")
                # 尝试发送，但可能会失败
                # 在生产环境中，可能需要实现TCP隧道或分片机制
            
            # 发送给所有已知的客户端（实际应用中可能需要更智能的选择策略）
            if self.clients:
                # 选择最近活跃的客户端
                client_addr = list(self.clients.values())[0][0]
                
                # 发送数据包
                self.transport.sendto(packet, client_addr)
                
                # 记录等待响应
                self.pending_requests[request_data['id']] = {
                    'web_writer': web_writer,
                    'timestamp': time.time()
                }
                
                print(f"已转发请求 {request_data['id']} 到客户端 {client_addr}")
            else:
                # 没有客户端连接
                web_writer.write(b'HTTP/1.1 503 Service Unavailable\r\n\r\nNo client connected')
                await web_writer.drain()
                web_writer.close()
                
        except Exception as e:
            print(f"转发请求时出错: {e}")
            import traceback
            traceback.print_exc()
            web_writer.write(b'HTTP/1.1 500 Internal Server Error\r\n\r\nInternal error')
            await web_writer.drain()
            web_writer.close()
    
    def handle_udp_packet(self, data: bytes, addr: tuple):
        """处理来自UDP客户端的数据包"""
        try:
            # 解析数据包
            if len(data) < 4:
                return
                
            # 读取签名长度
            signature_length = int.from_bytes(data[:4], byteorder='big')
            if len(data) < 4 + signature_length:
                return
                
            # 提取签名和数据
            signature = data[4:4+signature_length].decode('utf-8')
            json_data = data[4+signature_length:]
            
            # 验证签名
            if not self.verify_signature(json_data, signature):
                print("签名验证失败")
                return
            
            # 解析JSON数据
            response_data = json.loads(json_data.decode('utf-8'))
            
            # 处理客户端注册
            if response_data.get('type') == 'register':
                client_id = response_data.get('client_id')
                self.clients[client_id] = (addr, time.time())
                print(f"客户端 {client_id} 已注册，地址: {addr}")
                return
            
            # 更新客户端最后活跃时间
            for client_id, (client_addr, _) in self.clients.items():
                if client_addr == addr:
                    self.clients[client_id] = (addr, time.time())
                    break
            
            # 处理响应数据
            request_id = response_data.get('request_id')
            if request_id in self.pending_requests:
                handler_info = self.pending_requests.pop(request_id)
                web_writer = handler_info['web_writer']
                
                # 发送响应给Web客户端
                response_content = response_data.get('data', '').encode('utf-8')
                # 使用asyncio.create_task确保正确调度异步任务
                asyncio.create_task(self.send_response(web_writer, response_content))
                print(f"已发送响应 {request_id} 给Web客户端")
                
        except Exception as e:
            print(f"处理UDP包时出错: {e}")

    async def send_response(self, web_writer, response_content):
        """异步发送响应"""
        try:
            web_writer.write(response_content)
            await web_writer.drain()
            web_writer.close()
        except Exception as e:
            print(f"发送响应时出错: {e}")
    
    async def start_http_server(self):
        """启动HTTP服务器"""
        server = await asyncio.start_server(
            self.handle_request, 
            self.host, 
            self.http_port  # HTTP服务端口
        )
        print(f"HTTP服务器运行在 {self.host}:{self.http_port}")
        return server
    
    def connection_made(self, transport):
        """UDP连接建立"""
        self.transport = transport
    
    def datagram_received(self, data, addr):
        """收到UDP数据包"""
        self.handle_udp_packet(data, addr)
    
    def cleanup_inactive_clients(self):
        """清理不活跃的客户端"""
        current_time = time.time()
        inactive_clients = []
        
        for client_id, (addr, last_seen) in self.clients.items():
            if current_time - last_seen > 300:  # 5分钟超时
                inactive_clients.append(client_id)
        
        for client_id in inactive_clients:
            del self.clients[client_id]
            print(f"已清理不活跃客户端 {client_id}")
    
    async def run(self):
        """运行服务器"""
        # 启动UDP服务器
        loop = asyncio.get_running_loop()
        transport, protocol = await loop.create_datagram_endpoint(
            lambda: self,
            local_addr=(self.host, self.port)
        )
        
        # 启动HTTP服务器
        http_server = await self.start_http_server()
        
        # 定期清理不活跃客户端
        async def cleanup_routine():
            while True:
                await asyncio.sleep(60)  # 每分钟检查一次
                self.cleanup_inactive_clients()
        
        # 启动清理任务
        cleanup_task = asyncio.create_task(cleanup_routine())
        
        try:
            # 运行服务器
            await http_server.serve_forever()
        finally:
            cleanup_task.cancel()
            transport.close()
            http_server.close()

def main():
    parser = argparse.ArgumentParser(description='UDP隧道服务器')
    parser.add_argument('--host', default='0.0.0.0', help='监听地址')
    parser.add_argument('--udp-port', type=int, default=8081, help='UDP端口')
    parser.add_argument('--http-port', type=int, default=8080, help='HTTP端口')
    parser.add_argument('--secret-key', required=True, help='共享密钥')
    
    args = parser.parse_args()
    
    server = UDPTunnelServer(args.host, args.udp_port, args.secret_key, args.http_port)
    
    print(f"UDP隧道服务器启动在 {args.host}:{args.udp_port}")
    print(f"HTTP服务器运行在 {args.host}:{args.http_port}")
    print("使用共享密钥进行身份验证")
    
    try:
        asyncio.run(server.run())
    except KeyboardInterrupt:
        print("\n服务器已停止")

if __name__ == '__main__':
    main()