import asyncio
import json
import hashlib
import hmac
import uuid
import time
import aiohttp
from typing import Dict, Optional
import argparse

class TCPTunnelClient:
    def __init__(self, server_host: str, server_port: int, secret_key: str, local_api_url: str):
        self.server_host = server_host
        self.server_port = server_port
        self.secret_key = secret_key.encode('utf-8')
        self.local_api_url = local_api_url
        self.client_id = str(uuid.uuid4())
        self.reader = None
        self.writer = None
        self.connected = False
        
    def create_signature(self, data: bytes) -> str:
        """为数据创建签名"""
        return hmac.new(
            self.secret_key, 
            data, 
            hashlib.sha256
        ).hexdigest()
    
    def verify_signature(self, data: bytes, signature: str) -> bool:
        """验证数据签名"""
        expected_signature = hmac.new(
            self.secret_key, 
            data, 
            hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(signature, expected_signature)
    
    async def register_with_server(self):
        """向服务器注册客户端"""
        try:
            # 创建注册信息
            register_data = {
                'type': 'register',
                'client_id': self.client_id,
                'timestamp': time.time()
            }
            
            # 序列化数据
            json_data = json.dumps(register_data).encode('utf-8')
            
            # 创建签名
            signature = self.create_signature(json_data)
            
            # 构造TCP消息 (4字节签名长度 + 签名 + JSON数据)
            signature_bytes = signature.encode('utf-8')
            message = (
                len(signature_bytes).to_bytes(4, byteorder='big') +
                signature_bytes +
                json_data
            )
            
            # 发送注册消息
            self.writer.write(message)
            await self.writer.drain()
            print(f"已向服务器注册，客户端ID: {self.client_id}")
            
        except Exception as e:
            print(f"注册时出错: {e}")

    async def forward_request_to_local_api(self, request_data: dict) -> dict:
        """将请求转发给本地API并获取响应"""
        try:
            print(f"开始解析请求 {request_data['id']}")
            # 获取原始HTTP请求数据
            raw_request = request_data['data']
            print(f"原始请求数据长度: {len(raw_request)} 字符")
            
            # 查找头部和主体的分界线
            header_end_index = raw_request.find('\r\n\r\n')
            if header_end_index == -1:
                raise ValueError("无效的HTTP请求，未找到头部结束标记")
            
            headers_part = raw_request[:header_end_index]
            body_part = raw_request[header_end_index + 4:]  # 跳过 \r\n\r\n
            
            # 解析请求行 (GET /path HTTP/1.1)
            lines = headers_part.split('\r\n')
            request_line = lines[0]
            parts = request_line.split(' ')
            if len(parts) < 3:
                raise ValueError("无效的HTTP请求行")
            
            method = parts[0]
            path = parts[1]
            http_version = parts[2]
            
            print(f"解析得到: method={method}, path={path}, http_version={http_version}")
            
            # 解析头部
            headers = {}
            for line in lines[1:]:
                if ':' in line:
                    key, value = line.split(':', 1)
                    headers[key.strip()] = value.strip()
            
            print(f"解析得到头部: {headers}")
            print(f"解析得到主体长度: {len(body_part)} 字符")
            
            # 构造完整的本地API URL
            api_url = self.local_api_url.rstrip('/') + path
            print(f"构造API URL: {api_url}")
            
            # 检查本地API是否可达
            import urllib.parse
            try:
                parsed_url = urllib.parse.urlparse(self.local_api_url)
                hostname = parsed_url.hostname
                port = parsed_url.port or 80
                print(f"检查本地API地址: {hostname}:{port}")
                import socket
                socket.create_connection((hostname, port), timeout=5).close()
                print("本地API地址可达")
            except Exception as e:
                print(f"本地API地址不可达: {e}")
            
            # 使用aiohttp发送请求到本地API
            print(f"开始向本地API发送请求: {method} {api_url}")
            timeout = aiohttp.ClientTimeout(total=60)  # 增加超时时间到60秒
            async with aiohttp.ClientSession(timeout=timeout) as session:
                try:
                    # 对于包含文件上传的请求，使用bytes数据
                    content_type = headers.get('Content-Type', '')
                    if 'multipart/form-data' in content_type:
                        print("检测到multipart/form-data请求，使用原始字节数据")
                        # 将整个原始请求转换为字节数据
                        request_bytes = raw_request.encode('utf-8', errors='surrogateescape')
                        # 提取主体部分的字节数据
                        body_bytes = request_bytes[header_end_index + 4:]
                        print(f"主体字节数据长度: {len(body_bytes)} 字节")
                        
                        async with session.request(
                            method=method,
                            url=api_url,
                            headers=headers,
                            data=body_bytes
                        ) as response:
                            print(f"收到本地API响应: status={response.status}")
                            # 读取响应
                            response_body = await response.read()
                            print(f"响应主体大小: {len(response_body)} 字节")
                            
                            # 构造响应数据
                            response_headers = [
                                f"{key}: {value}" 
                                for key, value in response.headers.items()
                                if key.lower() != 'transfer-encoding'  # aiohttp会自动处理chunked
                            ]
                            
                            print(f"构造响应头部: {response_headers}")
                            
                            # 使用普通字符串格式化代替f-string中的转义字符
                            crlf = '\r\n'
                            response_text = (
                                f"HTTP/1.1 {response.status} {response.reason}{crlf}"
                                f"{crlf.join(response_headers)}{crlf}"
                                f"{crlf}"
                                f"{response_body.decode('utf-8', errors='ignore')}"
                            )
                            
                            print(f"完成响应构造，总长度: {len(response_text)} 字符")
                            return {
                                'request_id': request_data['id'],
                                'data': response_text
                            }
                    else:
                        # 对于非multipart请求，使用原来的处理方式
                        async with session.request(
                            method=method,
                            url=api_url,
                            headers=headers,
                            data=body_part.encode('utf-8') if body_part else None
                        ) as response:
                            print(f"收到本地API响应: status={response.status}")
                            # 读取响应
                            response_body = await response.read()
                            print(f"响应主体大小: {len(response_body)} 字节")
                            
                            # 构造响应数据
                            response_headers = [
                                f"{key}: {value}" 
                                for key, value in response.headers.items()
                                if key.lower() != 'transfer-encoding'  # aiohttp会自动处理chunked
                            ]
                            
                            print(f"构造响应头部: {response_headers}")
                            
                            # 使用普通字符串格式化代替f-string中的转义字符
                            crlf = '\r\n'
                            response_text = (
                                f"HTTP/1.1 {response.status} {response.reason}{crlf}"
                                f"{crlf.join(response_headers)}{crlf}"
                                f"{crlf}"
                                f"{response_body.decode('utf-8', errors='ignore')}"
                            )
                            
                            print(f"完成响应构造，总长度: {len(response_text)} 字符")
                            return {
                                'request_id': request_data['id'],
                                'data': response_text
                            }
                except asyncio.TimeoutError:
                    print("请求本地API超时")
                    raise
                except Exception as e:
                    print(f"请求本地API时发生错误: {e}")
                    import traceback
                    traceback.print_exc()
                    raise
        except Exception as e:
            print(f"转发请求到本地API时出错: {e}")
            import traceback
            traceback.print_exc()
            # 返回错误响应
            crlf = '\r\n'
            error_response = (
                f"HTTP/1.1 500 Internal Server Error{crlf}"
                f"Content-Type: text/plain{crlf}"
                f"{crlf}"
                f"Error forwarding request to local API: {str(e)}"
            )
            return {
                'request_id': request_data['id'],
                'data': error_response
            }

    async def send_response_to_server(self, response_data: dict):
        """发送响应到服务器"""
        try:
            print(f"开始发送响应 {response_data['request_id']} 到服务器")
            # 序列化响应数据
            json_data = json.dumps(response_data).encode('utf-8')
            print(f"序列化响应数据，大小: {len(json_data)} 字节")
            
            # 创建签名
            signature = self.create_signature(json_data)
            print("签名创建完成")
            
            # 构造TCP消息
            signature_bytes = signature.encode('utf-8')
            message = len(signature_bytes).to_bytes(4, byteorder='big') + signature_bytes + json_data
            print(f"构造TCP消息，总大小: {len(message)} 字节")
            
            # 发送数据（最大化传输速度）
            chunk_size = 262144  # 增加到256KB分块
            total_sent = 0
            total_size = len(message)
            
            while total_sent < total_size:
                chunk = message[total_sent:total_sent + chunk_size]
                self.writer.write(chunk)
                await self.writer.drain()
                
                total_sent += len(chunk)
                # 每发送50MB数据后报告进度
                if total_sent % (50 * 1024 * 1024) == 0 or total_sent == total_size:
                    print(f"发送进度: {total_sent}/{total_size} 字节 ({100*total_sent/total_size:.1f}%)")
                
                # 最小化延迟以最大化传输速度
                if total_sent % (10 * 1024 * 1024) == 0:  # 每10MB延迟一次
                    await asyncio.sleep(0.0001)
            
            print(f"已发送响应 {response_data['request_id']} 到服务器")
            
        except Exception as e:
            print(f"发送响应到服务器时出错: {e}")
            import traceback
            traceback.print_exc()

    async def handle_request(self, request_data: dict):
        """处理来自服务器的请求"""
        try:
            print(f"收到请求 {request_data['id']}，正在转发到本地API")
            
            # 转发请求到本地API并获取响应
            response_data = await self.forward_request_to_local_api(request_data)
            print(f"从本地API收到响应，准备发送回服务器")
            
            # 发送响应回服务器
            await self.send_response_to_server(response_data)
            print(f"已完成处理请求 {request_data['id']}")
            
        except Exception as e:
            print(f"处理请求时出错: {e}")
            import traceback
            traceback.print_exc()

    async def connect_to_server(self):
        """连接到隧道服务器"""
        try:
            # 设置更大的超时时间以处理大文件传输
            self.reader, self.writer = await asyncio.open_connection(
                self.server_host, self.server_port,
                limit=2**24  # 增加缓冲区大小到16MB
            )
            
            # 设置写入超时和缓冲区限制
            self.writer.transport.set_write_buffer_limits(high=2**23, low=2**22)
            
            self.connected = True
            print(f"已连接到隧道服务器 {self.server_host}:{self.server_port}")
            
            # 注册到服务器
            await self.register_with_server()
            
            # 开始接收消息
            await self.receive_messages()
            
        except Exception as e:
            print(f"连接到服务器时出错: {e}")
            self.connected = False

    async def receive_messages(self):
        """接收来自服务器的消息"""
        try:
            while self.connected:
                # 读取TCP消息
                # 首先读取签名长度
                length_data = await self.reader.readexactly(4)
                signature_length = int.from_bytes(length_data, byteorder='big')
                
                # 读取签名
                signature_data = await self.reader.readexactly(signature_length)
                signature = signature_data.decode('utf-8')
                
                # 读取JSON数据
                # 使用更可靠的方法读取JSON数据
                json_data_buffer = bytearray()
                while True:
                    try:
                        # 尝试读取数据
                        chunk = await self.reader.read(8192)
                        if not chunk:
                            break
                        json_data_buffer.extend(chunk)
                        
                        # 尝试解析当前缓冲区中的数据
                        try:
                            json_str = json_data_buffer.decode('utf-8')
                            # 检查是否是一个完整的JSON对象
                            request_data = json.loads(json_str)
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
                    request_data = json.loads(json_data.decode('utf-8'))
                except json.JSONDecodeError as e:
                    print(f"JSON解析失败: {e}")
                    continue
                
                # 处理请求（同步处理，确保顺序性）
                await self.handle_request(request_data)
                
        except asyncio.IncompleteReadError:
            print("与服务器的连接已断开")
            self.connected = False
        except Exception as e:
            print(f"接收消息时出错: {e}")
            import traceback
            traceback.print_exc()
            self.connected = False

    async def run(self):
        """运行客户端"""
        # 检查本地API是否可达
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.local_api_url}/health") as response:
                    if response.status == 200:
                        print(f"本地API健康检查通过: {self.local_api_url}")
                    else:
                        print(f"警告: 本地API健康检查失败，状态码: {response.status}")
        except Exception as e:
            print(f"警告: 无法连接到本地API: {e}")
        
        # 连接到服务器
        await self.connect_to_server()

def main():
    parser = argparse.ArgumentParser(description='TCP隧道客户端')
    parser.add_argument('--server-host', required=True, help='服务器地址')
    parser.add_argument('--server-port', type=int, default=8081, help='服务器TCP端口')
    parser.add_argument('--secret-key', required=True, help='共享密钥')
    parser.add_argument('--local-api-url', default='http://localhost:5001', help='本地API地址')
    
    args = parser.parse_args()
    
    client = TCPTunnelClient(
        server_host=args.server_host,
        server_port=args.server_port,
        secret_key=args.secret_key,
        local_api_url=args.local_api_url
    )
    
    print(f"TCP隧道客户端连接到 {args.server_host}:{args.server_port}")
    print(f"本地API地址: {args.local_api_url}")
    print("使用共享密钥进行身份验证")
    
    try:
        asyncio.run(client.run())
    except KeyboardInterrupt:
        print("\n客户端已停止")

if __name__ == '__main__':
    main()