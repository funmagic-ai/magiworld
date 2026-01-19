## 步骤 8：配置 Cloudflare DNS

Cloudflare 为您的域名提供 DNS 管理、DDoS 防护和 CDN 缓存。

### 8.1 将您的域名添加到 Cloudflare

**第 1 步：创建 Cloudflare 账户并添加站点**

1. 进入 [Cloudflare 控制面板](https://dash.cloudflare.com/)
2. 创建账户或登录
3. 点击 **Add a Site** → 输入您的域名：`funmagic.ai`
4. 选择套餐（大多数情况下免费套餐即可）
5. 点击 **Continue**

**第 2 步：检查 DNS 记录（邮件配置很重要）**

1. Cloudflare 将从 GoDaddy 扫描您现有的 DNS 记录
2. **验证您的邮件记录已导入** - 查找：
   - MX 记录（邮件服务器）
   - TXT 记录（SPF、DKIM、DMARC）
   - CNAME 记录（mail.funmagic.ai 等）
3. 如果缺少任何记录，请在继续之前手动添加
4. 点击 **Continue**

> **警告**：如果您使用 Google Workspace 邮箱，请确保所有 MX 记录都已导入。缺少 MX 记录 = 邮件停止工作！

**第 3 步：记录您的 Cloudflare 域名服务器**

Cloudflare 将为您分配两个域名服务器。它们看起来像这样：
```
ada.ns.cloudflare.com
bob.ns.cloudflare.com
```
> **重要提示**：请记下这些信息 - 下一步需要用到。

**第 4 步：在 GoDaddy 中更新域名服务器**

1. 登录 [GoDaddy](https://www.godaddy.com/)
2. 进入 **My Products** → 找到 `funmagic.ai` → 点击 **DNS** 或 **Manage**
3. 向下滚动到 **Nameservers** 部分
4. 点击 **Change**（在"Using default nameservers"旁边）
5. 选择 **Enter my own nameservers (advanced)**
6. 输入 Cloudflare 域名服务器：
   - 域名服务器 1：`ada.ns.cloudflare.com`（使用您分配的域名服务器）
   - 域名服务器 2：`bob.ns.cloudflare.com`（使用您分配的域名服务器）
7. 点击 **Save**
8. 出现提示时确认更改

**第 5 步：在 Cloudflare 中验证**

1. 返回 Cloudflare 控制面板
2. 点击 **Done, check nameservers**
3. 等待传播（通常需要 10 分钟到 24 小时）
4. 当您的站点激活时，Cloudflare 会发送电子邮件通知您

> **注意**：在等待传播期间，您仍可以在 Cloudflare 中配置 DNS 记录。域名服务器传播后，这些记录将生效。

**第 6 步：在 GoDaddy 中禁用 DNSSEC（如果已启用）**

如果您在 GoDaddy 中启用了 DNSSEC，则必须在更改域名服务器之前禁用它：

1. 在 GoDaddy 中 → **DNS** → **DNSSEC**
2. 关闭 DNSSEC
3. 等待 24-48 小时后再更改域名服务器
4. 迁移完成后，您可以在 Cloudflare 中重新启用 DNSSEC

### 8.2 保留 Google Workspace 邮件记录

如果您使用 Google Workspace（Gmail）处理邮件，请确保 Cloudflare 中存在以下记录：

**MX 记录（接收邮件必需）**

| 类型 | 名称 | 邮件服务器 | 优先级 |
|------|------|------------|--------|
| MX | `@` | `aspmx.l.google.com` | 1 |
| MX | `@` | `alt1.aspmx.l.google.com` | 5 |
| MX | `@` | `alt2.aspmx.l.google.com` | 5 |
| MX | `@` | `alt3.aspmx.l.google.com` | 10 |
| MX | `@` | `alt4.aspmx.l.google.com` | 10 |

**SPF 记录（发送邮件必需）**

| 类型 | 名称 | 内容 |
|------|------|------|
| TXT | `@` | `v=spf1 include:_spf.google.com ~all` |

**DKIM 记录（用于邮件认证）**

从以下位置获取：Google 管理控制台 → 应用 → Google Workspace → Gmail → 验证电子邮件

| 类型 | 名称 | 内容 |
|------|------|------|
| TXT | `google._domainkey` | `v=DKIM1; k=rsa; p=YOUR_DKIM_KEY` |

**DMARC 记录（可选但推荐）**

| 类型 | 名称 | 内容 |
|------|------|------|
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:admin@funmagic.ai` |

**如何在 Cloudflare 中添加 MX 记录：**

1. 进入 **Cloudflare 控制面板** → **funmagic.ai** → **DNS** → **Records**
2. 点击 **Add record**
3. **类型**：MX
4. **名称**：`@`（代表 funmagic.ai）
5. **邮件服务器**：`aspmx.l.google.com`
6. **优先级**：1
7. **代理状态**：仅 DNS（MX 记录无法代理）
8. 点击 **Save**
9. 对其余 MX 记录重复此操作

**验证邮件是否正常工作：**

域名服务器传播后，通过以下方式测试：
1. 从 Gmail/外部向您的 funmagic.ai 地址发送电子邮件
2. 从您的 funmagic.ai 地址发送电子邮件
3. 使用 [MXToolbox](https://mxtoolbox.com/SuperTool.aspx?action=mx:funmagic.ai) 验证 MX 记录

### 8.3 为 CloudFront 配置 DNS 记录

为您的 CloudFront 分发添加 CNAME 记录：

| 类型 | 名称 | 目标 | 代理状态 |
|------|------|------|----------|
| CNAME | `cdn` | `d5678cdn.cloudfront.net` | 仅 DNS（灰色云图标） |
| CNAME | `shared` | `d9012shared.cloudfront.net` | 仅 DNS（灰色云图标） |

> **重要提示**：对于 CloudFront CNAME，将代理状态设置为**仅 DNS**（灰色云图标）。CloudFront 处理 SSL 和缓存，因此 Cloudflare 代理会导致冲突。

### 8.4 为 AWS EC2（应用程序）配置 DNS 记录

对于指向 EC2 实例的主应用程序域名：

| 类型 | 名称 | 内容 | 代理状态 |
|------|------|------|----------|
| A | `@` | `YOUR_EC2_ELASTIC_IP` | 已代理（橙色云图标） |
| A | `www` | `YOUR_EC2_ELASTIC_IP` | 已代理（橙色云图标） |
| A | `admin` | `YOUR_EC2_ELASTIC_IP` | 已代理（橙色云图标） |

> **注意**：使用 A 记录（而非 CNAME），因为我们有静态弹性 IP。从 EC2 → Elastic IPs 获取您的 IP。

### 8.5 配置 CloudFront 以接受自定义域名

对于使用自定义域名的每个 CloudFront 分发：

1. **在 AWS Certificate Manager (ACM) 中请求 SSL 证书**：
   - 进入 **ACM** → **Request certificate**（CloudFront 必须在 `us-east-1`）
   - **域名**：`cdn.funmagic.ai`、`shared.funmagic.ai`
   - **验证方法**：DNS 验证
   - 点击 **Request**

2. **在 Cloudflare 中添加 DNS 验证记录**：
   - ACM 将提供用于验证的 CNAME 记录
   - 在 Cloudflare 中添加这些记录（仅 DNS，灰色云图标）
   - 等待验证（通常 5-30 分钟）

3. **更新 CloudFront 分发**：
   - 进入 **CloudFront** → 分发 → **Edit**
   - **备用域名 (CNAMEs)**：添加 `cdn.funmagic.ai`
   - **自定义 SSL 证书**：选择 ACM 证书
   - 点击 **Save changes**

### 8.6 Cloudflare SSL/TLS 设置

1. 进入 **Cloudflare 控制面板** → 您的域名 → **SSL/TLS**
2. 将加密模式设置为 **Full (strict)**
3. 进入 **Edge Certificates** → 启用 **Always Use HTTPS**

### 8.7 Cloudflare 页面规则（可选）

用于缓存静态资源：

1. 进入 **Rules** → **Page Rules** → **Create Page Rule**
2. URL：`cdn.funmagic.ai/*`
3. 设置：
   - 缓存级别：缓存所有内容
   - 边缘缓存 TTL：1 个月
4. 点击 **Save and Deploy**

---

