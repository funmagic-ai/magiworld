# UDP/TCP隧道服务使用说明

## 概述

本方案通过隧道实现云端Web应用访问本地API服务的功能。包含两个组件：
1. 隧道服务器（运行在云端）
2. 隧道客户端（运行在本地，与API服务在同一网络）

支持两种隧道类型：
- UDP隧道（原始实现）
- TCP隧道（推荐，支持大文件传输）

## 架构图

```
┌─────────────────┐         ┌────────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   Cloud Web     │  HTTP   │  Tunnel Server     │  Tunnel │  Tunnel Client   │  HTTP   │  Local API      │
│   Application   ├─────────▶  (Cloud)           ├─────────▶  (Local)          ├─────────▶  Service:5001   │
└─────────────────┘         └────────────────────┘         └──────────────────┘         └─────────────────┘
```

## 部署步骤

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 启动本地API服务

确保本地API服务已在5001端口运行：

```bash
python pointcloud_api.py
```

### 3. 启动TCP隧道服务器（云端）

在云端服务器上运行：

```bash
python tcp_tunnel_server.py --host 0.0.0.0 --tcp-port 8081 --http-port 8080 --secret-key YOUR_SECRET_KEY
```

参数说明：
- `--host`: 服务器监听地址，默认为0.0.0.0
- `--tcp-port`: TCP隧道端口，默认为8081
- `--http-port`: HTTP端口，默认为8080
- `--secret-key`: 共享密钥，用于身份验证

### 4. 启动TCP隧道客户端（本地）

在本地运行：

```bash
python tcp_tunnel_client.py --server-host SERVER_IP --server-port 8081 --secret-key YOUR_SECRET_KEY
```

参数说明：
- `--server-host`: 隧道服务器IP地址
- `--server-port`: 隧道服务器TCP端口，默认为8081
- `--secret-key`: 共享密钥，必须与服务器端一致
- `--local-api-url`: 本地API地址，默认为http://localhost:5001

## 安全说明

1. 使用共享密钥进行身份验证和数据签名
2. 所有通过隧道传输的数据都经过签名验证
3. 客户端需要正确的共享密钥才能注册到服务器
4. 建议使用强密码作为共享密钥

## 使用示例

假设隧道服务器运行在 `cloud.example.com`，本地API服务正常运行：

1. 启动TCP隧道服务器：
```bash
python tcp_tunnel_server.py --host 0.0.0.0 --tcp-port 8081 --http-port 8080 --secret-key mysecretpassword
```

2. 启动TCP隧道客户端：
```bash
python tcp_tunnel_client.py --server-host cloud.example.com --server-port 8081 --secret-key mysecretpassword
```

3. 从任何地方访问云端隧道服务器的8080端口，请求将被转发到本地API：
```bash
curl -X POST -F "image=@test.png" http://cloud.example.com:8080/pointcloud
```

## 故障排除

### 客户端无法连接到服务器
1. 检查服务器防火墙是否开放TCP端口
2. 确认服务器IP地址和端口正确
3. 验证共享密钥是否匹配

### 请求无法返回结果
1. 检查本地API服务是否正常运行
2. 查看客户端日志确认请求是否正确转发
3. 检查网络连接是否稳定

### 性能问题
1. 对于大文件传输，TCP隧道比UDP隧道更可靠
2. 如果延迟较高，可以考虑优化网络路径

## 传统UDP隧道（不推荐用于大文件）

如果您仍需要使用UDP隧道，请参考以下说明：

### 启动UDP隧道服务器（云端）

在云端服务器上运行：

```bash
python tunnel_server.py --host 0.0.0.0 --udp-port 8081 --http-port 8080 --secret-key YOUR_SECRET_KEY
```

### 启动UDP隧道客户端（本地）

在本地运行：

```bash
python tunnel_client.py --server-host SERVER_IP --server-port 8081 --secret-key YOUR_SECRET_KEY
```