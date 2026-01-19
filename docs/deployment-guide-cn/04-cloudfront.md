## 步骤 5：设置 CloudFront 分发

我们需要 **4 个 CloudFront 分发**：

| 分发 | 源存储桶 | 访问控制 |
|------|----------|----------|
| `funmagic-cf-admin-private` | `funmagic-admin-users-assets` | OAC + 签名 URL |
| `funmagic-cf-public` | `funmagic-web-public-assets` | 公开 |
| `funmagic-cf-web-private` | `funmagic-web-users-assets-private` | OAC + 签名 URL |
| `funmagic-cf-web-shared` | `funmagic-web-users-assets-shared` | 公开 |

### 5.1 `funmagic-admin-users-assets` 的 CloudFront（带 OAC 的私有分发）

1. 进入 **CloudFront** → **Create distribution**

2. **源设置：**
   - **源域名**：`funmagic-admin-users-assets.s3.us-east-2.amazonaws.com`
   - **源访问**：选择 **Origin access control settings (recommended)**
   - 点击 **Create new OAC**：
     - 名称：`funmagic-admin-users-assets-oac`
     - 签名行为：**Sign requests (recommended)**
     - 点击 **Create**

3. **默认缓存行为：**
   - **查看器协议策略**：将 HTTP 重定向到 HTTPS
   - **允许的 HTTP 方法**：GET, HEAD
   - **缓存策略**：CachingOptimized

4. 点击 **Create distribution**

5. **更新 S3 存储桶策略**（CloudFront 会显示一个包含策略的横幅）：
   - 进入 **S3** → **funmagic-admin-users-assets** → **Permissions** → **Bucket policy**
   - 粘贴 CloudFront 提供的策略：

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowCloudFrontServicePrincipal",
            "Effect": "Allow",
            "Principal": {
                "Service": "cloudfront.amazonaws.com"
            },
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::funmagic-admin-users-assets/*",
            "Condition": {
                "StringEquals": {
                    "AWS:SourceArn": "arn:aws:cloudfront::YOUR_ACCOUNT_ID:distribution/DISTRIBUTION_ID"
                }
            }
        }
    ]
}
```

6. 记录 **分发域名**（例如 `d1234admin.cloudfront.net`）

### 5.2 `funmagic-web-public-assets` 的 CloudFront（公开）

1. 进入 **CloudFront** → **Create distribution**

2. **源设置：**
   - **源域名**：`funmagic-web-public-assets.s3.us-east-2.amazonaws.com`
   - **源访问**：公开

3. **默认缓存行为：**
   - **查看器协议策略**：将 HTTP 重定向到 HTTPS
   - **缓存策略**：CachingOptimized

4. **设置：**
   - **备用域名 (CNAME)**：`cdn.funmagic.ai`（可选，稍后配置）
   - **SSL 证书**：请求或导入证书（如果使用自定义域名）

5. 点击 **Create distribution**

6. 记录 **分发域名**（例如 `d5678cdn.cloudfront.net`）

### 5.3 `funmagic-web-users-assets-private` 的 CloudFront（带 OAC 的私有分发）

使用以下配置重复步骤 5.1：
- **源域名**：`funmagic-web-users-assets-private.s3.us-east-2.amazonaws.com`
- **OAC 名称**：`funmagic-web-users-assets-private-oac`

更新 `funmagic-web-users-assets-private` 的 S3 存储桶策略：

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowCloudFrontServicePrincipal",
            "Effect": "Allow",
            "Principal": {
                "Service": "cloudfront.amazonaws.com"
            },
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::funmagic-web-users-assets-private/*",
            "Condition": {
                "StringEquals": {
                    "AWS:SourceArn": "arn:aws:cloudfront::YOUR_ACCOUNT_ID:distribution/DISTRIBUTION_ID"
                }
            }
        }
    ]
}
```

### 5.4 `funmagic-web-users-assets-shared` 的 CloudFront（公开）

使用以下配置重复步骤 5.2：
- **源域名**：`funmagic-web-users-assets-shared.s3.us-east-2.amazonaws.com`
- **备用域名 (CNAME)**：`shared.funmagic.ai`（可选）

---

## 步骤 6：配置签名 URL

私有存储桶（`funmagic-admin-users-assets` 和 `funmagic-web-users-assets-private`）需要签名 URL。

### 6.1 创建 CloudFront 密钥对

1. 进入 **CloudFront** → **Public keys** → **Create public key**

2. **在本地生成密钥对**（在终端中运行）：
   ```bash
   # Generate private key
   openssl genrsa -out cloudfront-private-key.pem 2048

   # Extract public key
   openssl rsa -pubout -in cloudfront-private-key.pem -out cloudfront-public-key.pem

   # View the public key (you'll paste this in AWS)
   cat cloudfront-public-key.pem
   ```

3. 在 AWS 控制台中：
   - **名称**：`funmagic-signing-key`
   - **密钥值**：粘贴 `cloudfront-public-key.pem` 的内容（包括头部）
   - 点击 **Create public key**
   - **复制密钥 ID**（例如 `K2XXXXXXXXXXXXXX`）

### 6.2 创建密钥组

1. 进入 **CloudFront** → **Key groups** → **Create key group**
2. **名称**：`funmagic-key-group`
3. **公钥**：选择 `funmagic-signing-key`
4. 点击 **Create key group**

### 6.3 配置分发以要求签名 URL

对于 `funmagic-cf-admin-private` 和 `funmagic-cf-web-private` 两个分发：

1. 进入 **CloudFront** → **Distributions** → 选择分发
2. 进入 **Behaviors** 标签页 → 选择默认行为 → **Edit**
3. 滚动到 **Restrict viewer access**：
   - 选择 **Yes**
   - **受信任的授权类型**：受信任的密钥组
   - **受信任的密钥组**：选择 `funmagic-key-group`
4. 点击 **Save changes**
5. 等待分发部署完成（状态："Deployed"）

### 6.4 安全存储私钥

1. **将私钥转换为单行**以用于环境变量：
   ```bash
   # This creates a single-line version with \n escaped
   awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' cloudfront-private-key.pem
   ```

2. **添加到 `.env.local`**（参见步骤 11）

3. 复制到环境变量后**删除本地密钥文件**：
   ```bash
   rm cloudfront-private-key.pem cloudfront-public-key.pem
   ```

---

## 步骤 7：设置生命周期策略

### 7.1 `funmagic-web-users-assets-private` 的生命周期

1. 进入 **S3** → **funmagic-web-users-assets-private** → **Management** 标签页
2. 点击 **Create lifecycle rule**

**规则 1：删除旧上传文件**
- **规则名称**：`DeleteOldUploads`
- **规则范围**：使用过滤器限制范围
- **前缀**：留空或使用特定路径
- **按标签过滤**：无
- **生命周期规则操作**：✅ 使对象的当前版本过期
- **对象创建后的天数**：`30`
- 点击 **Create rule**

**规则 2：中止未完成的分段上传**
1. 创建另一个生命周期规则
2. **规则名称**：`AbortIncompleteMultipart`
3. **生命周期规则操作**：✅ 删除过期的对象删除标记或未完成的分段上传
4. **启动后的天数**：`1`
5. 点击 **Create rule**

---

