import asyncio
import json
import hashlib
import hmac
import uuid
import time
from typing import Dict, Optional
import argparse

class TCPTunnelServer:
    def __init__(self, host: str, port: int, secret_key: str, http_port: int = 8080):
        self.host = host
        self.port = port
        self.http_port = http_port
        self.secret_key = secret_key.encode('utf-8')
        self.clients: Dict[str, tuple] = {}  # client_id -> (writer, last_seen)
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
    
    async def handle_web_request(self, reader, writer):
        """处理来自Web客户端的HTTP请求"""
        # 增加缓冲区大小以处理大文件
        reader._limit = 2**20  # 设置为1MB
        
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
                # 读取请求体数据
                body_data = await reader.readexactly(content_length)
            
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
            print(f"处理Web请求时出错: {e}")
            import traceback
            traceback.print_exc()
            try:
                writer.write(b'HTTP/1.1 500 Internal Server Error\r\n\r\nInternal error')
                await writer.drain()
            except:
                pass
            writer.close()

    async def forward_to_client(self, request_data: dict, web_writer):
        """将请求转发给本地客户端"""
        try:
            # 序列化请求数据
            json_data = json.dumps(request_data).encode('utf-8')
            print(f"序列化请求数据大小: {len(json_data)} 字节")
            
            # 创建签名
            signature = self.create_signature(json_data)
            
            # 构造TCP消息 (signature_length(4) + signature + data)
            signature_bytes = signature.encode('utf-8')
            message = len(signature_bytes).to_bytes(4, byteorder='big') + signature_bytes + json_data
            
            print(f"构造TCP消息大小: {len(message)} 字节")
            
            # 发送给所有已知的客户端（实际应用中可能需要更智能的选择策略）
            if self.clients:
                # 选择最近活跃的客户端
                client_writer = list(self.clients.values())[0][0]
                
                try:
                    # 发送数据
                    client_writer.write(message)
                    await client_writer.drain()
                    
                    # 记录等待响应
                    self.pending_requests[request_data['id']] = {
                        'web_writer': web_writer,
                        'timestamp': time.time()
                    }
                    
                    print(f"已转发请求 {request_data['id']} 到客户端")
                except Exception as e:
                    print(f"发送数据到客户端时出错: {e}")
                    import traceback
                    traceback.print_exc()
                    try:
                        web_writer.write(b'HTTP/1.1 500 Internal Server Error\r\n\r\nError sending to client')
                        await web_writer.drain()
                    except:
                        pass
                    try:
                        web_writer.close()
                    except:
                        pass
            else:
                # 没有客户端连接
                try:
                    web_writer.write(b'HTTP/1.1 503 Service Unavailable\r\n\r\nNo client connected')
                    await web_writer.drain()
                except:
                    pass
                try:
                    web_writer.close()
                except:
                    pass
                
        except Exception as e:
            print(f"转发请求时出错: {e}")
            import traceback
            traceback.print_exc()
            try:
                web_writer.write(b'HTTP/1.1 500 Internal Server Error\r\n\r\nInternal error')
                await web_writer.drain()
            except:
                pass
            try:
                web_writer.close()
            except:
                pass

    async def handle_client(self, reader, writer):
        """处理来自隧道客户端的连接"""
        client_addr = writer.get_extra_info('peername')
        print(f"新的客户端连接: {client_addr}")
        
        # 增加缓冲区大小以处理大文件
        reader._limit = 2**26  # 设置为16MB
        
        try:
            while True:
                # 读取TCP消息
                # 首先读取签名长度
                length_data = await reader.readexactly(4)
                signature_length = int.from_bytes(length_data, byteorder='big')
                
                # 读取签名
                signature_data = await reader.readexactly(signature_length)
                signature = signature_data.decode('utf-8')
                
                # 读取JSON数据
                # 使用更可靠的方法读取JSON数据
                json_data_buffer = bytearray()
                while True:
                    try:
                        # 尝试读取数据
                        chunk = await reader.read(32768)  # 增加读取块大小到32KB
                        if not chunk:
                            break
                        json_data_buffer.extend(chunk)
                        
                        # 尝试解析当前缓冲区中的数据
                        try:
                            json_str = json_data_buffer.decode('utf-8')
                            # 检查是否是一个完整的JSON对象
                            response_data = json.loads(json_str)
                            # 如果成功解析，说明我们读取了完整的数据
                            break
                        except json.JSONDecodeError:
                            # 如果解析失败，继续读取更多数据
                            continue
                    except Exception as e:
                        print(f"读取数据时出错: {e}")
                        break
                
                json_data = bytes(json_data_buffer)
                
                # 验证签名
                if not self.verify_signature(json_data, signature):
                    print("签名验证失败")
                    continue
                
                # 解析JSON数据
                try:
                    response_data = json.loads(json_data.decode('utf-8'))
                except json.JSONDecodeError as e:
                    print(f"JSON解析失败: {e}")
                    continue
                
                # 处理客户端注册
                if response_data.get('type') == 'register':
                    client_id = response_data.get('client_id')
                    self.clients[client_id] = (writer, time.time())
                    print(f"客户端 {client_id} 已注册")
                    continue
                
                # 更新客户端最后活跃时间
                for client_id, (client_writer, _) in self.clients.items():
                    if client_writer == writer:
                        self.clients[client_id] = (writer, time.time())
                        break
                
                # 处理响应数据
                request_id = response_data.get('request_id')
                if request_id in self.pending_requests:
                    handler_info = self.pending_requests.pop(request_id)
                    web_writer = handler_info['web_writer']
                    
                    try:
                        # 发送响应给Web客户端
                        response_content = response_data.get('data', '').encode('utf-8', errors='surrogateescape')
                        print(f"准备发送响应，大小: {len(response_content)} 字节")
                        
                        # 使用更大的分块以最大化传输速度
                        chunk_size = 262144  # 增加到256KB分块
                        total_sent = 0
                        total_size = len(response_content)
                        
                        while total_sent < total_size:
                            chunk = response_content[total_sent:total_sent + chunk_size]
                            web_writer.write(chunk)
                            await web_writer.drain()
                            
                            total_sent += len(chunk)
                            # 每发送50MB数据后报告进度
                            if total_sent % (50 * 1024 * 1024) == 0 or total_sent == total_size:
                                print(f"发送进度: {total_sent}/{total_size} 字节 ({100*total_sent/total_size:.1f}%)")
                            
                            # 最小化延迟以最大化传输速度
                            if total_sent % (10 * 1024 * 1024) == 0:  # 每10MB延迟一次
                                await asyncio.sleep(0.0001)
                        
                        print(f"已发送响应 {request_id} 给Web客户端")
                    except Exception as e:
                        print(f"发送响应给Web客户端时出错: {e}")
                        import traceback
                        traceback.print_exc()
                    finally:
                        try:
                            web_writer.close()
                        except:
                            pass
                    print(f"已完成处理请求 {request_id}")
                    
        except asyncio.IncompleteReadError:
            print(f"客户端 {client_addr} 连接已关闭")
        except Exception as e:
            print(f"处理客户端连接时出错: {e}")
            import traceback
            traceback.print_exc()
        finally:
            # 清理客户端连接
            for client_id, (client_writer, _) in list(self.clients.items()):
                if client_writer == writer:
                    del self.clients[client_id]
                    print(f"已清理客户端 {client_id}")
            writer.close()

    async def start_http_server(self):
        """启动HTTP服务器"""
        server = await asyncio.start_server(
            self.handle_web_request, 
            self.host, 
            self.http_port
        )
        print(f"HTTP服务器运行在 {self.host}:{self.http_port}")
        return server
    
    async def start_tunnel_server(self):
        """启动隧道服务器"""
        server = await asyncio.start_server(
            self.handle_client,
            self.host,
            self.port
        )
        print(f"TCP隧道服务器运行在 {self.host}:{self.port}")
        return server

    def cleanup_inactive_clients(self):
        """清理不活跃的客户端"""
        current_time = time.time()
        inactive_clients = []
        
        for client_id, (writer, last_seen) in self.clients.items():
            if current_time - last_seen > 300:  # 5分钟超时
                inactive_clients.append(client_id)
        
        for client_id in inactive_clients:
            del self.clients[client_id]
            print(f"已清理不活跃客户端 {client_id}")
    
    async def run(self):
        """运行服务器"""
        # 启动HTTP服务器
        http_server = await self.start_http_server()
        
        # 启动隧道服务器
        tunnel_server = await self.start_tunnel_server()
        
        # 定期清理不活跃客户端
        async def cleanup_routine():
            while True:
                await asyncio.sleep(60)  # 每分钟检查一次
                self.cleanup_inactive_clients()
        
        # 启动清理任务
        cleanup_task = asyncio.create_task(cleanup_routine())
        
        try:
            # 运行服务器
            await asyncio.gather(
                http_server.serve_forever(),
                tunnel_server.serve_forever()
            )
        except KeyboardInterrupt:
            print("\n服务器已停止")
        finally:
            cleanup_task.cancel()
            http_server.close()
            tunnel_server.close()

def main():
    parser = argparse.ArgumentParser(description='TCP隧道服务器')
    parser.add_argument('--host', default='0.0.0.0', help='监听地址')
    parser.add_argument('--tcp-port', type=int, default=8081, help='TCP隧道端口')
    parser.add_argument('--http-port', type=int, default=8080, help='HTTP端口')
    parser.add_argument('--secret-key', required=True, help='共享密钥')
    
    args = parser.parse_args()
    
    server = TCPTunnelServer(args.host, args.tcp_port, args.secret_key, args.http_port)
    
    print(f"TCP隧道服务器启动在 {args.host}:{args.tcp_port}")
    print(f"HTTP服务器运行在 {args.host}:{args.http_port}")
    print("使用共享密钥进行身份验证")
    
    try:
        asyncio.run(server.run())
    except KeyboardInterrupt:
        print("\n服务器已停止")

if __name__ == '__main__':
    main()