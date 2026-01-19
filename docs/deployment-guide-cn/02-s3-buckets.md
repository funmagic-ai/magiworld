## 步骤 1：创建 S3 存储桶

### 1.1 创建 `funmagic-admin-users-assets`（私有）

1. 进入 **AWS 控制台** → **S3** → **创建存储桶**
2. **存储桶名称**：`funmagic-admin-users-assets`（或您的唯一名称带前缀）
3. **AWS 区域**：`us-east-2`（俄亥俄州）或您偏好的区域
4. **对象所有权**：禁用 ACL（推荐）
5. **阻止公共访问**：✅ 阻止*所有*公共访问（保持所有 4 个复选框选中）
6. 点击 **创建存储桶**

### 1.2 创建 `funmagic-web-public-assets`（公开）

1. **创建存储桶** → **存储桶名称**：`funmagic-web-public-assets`
2. **区域**：与上面相同
3. **阻止公共访问**：⬜ **取消选中** "阻止所有公共访问"
   - ⬜ 取消选中所有 4 个子选项
   - ✅ 选中 "我确认当前设置可能导致此存储桶及其中的对象变为公开"
4. 点击 **创建存储桶**

### 1.3 创建 `funmagic-web-users-assets-private`（私有）

1. **创建存储桶** → **存储桶名称**：`funmagic-web-users-assets-private`
2. **区域**：与上面相同
3. **阻止公共访问**：✅ 阻止*所有*公共访问
4. 点击 **创建存储桶**

### 1.4 创建 `funmagic-web-users-assets-shared`（公开）

1. **创建存储桶** → **存储桶名称**：`funmagic-web-users-assets-shared`
2. **区域**：与上面相同
3. **阻止公共访问**：⬜ **取消选中** "阻止所有公共访问"
4. 点击 **创建存储桶**

---

## 步骤 2：配置存储桶策略

### 2.1 `funmagic-web-public-assets` 的公开读取策略

1. 进入 **S3** → **funmagic-web-public-assets** → **权限** 标签页
2. 滚动到 **存储桶策略** → 点击 **编辑**
3. 粘贴：

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::funmagic-web-public-assets/*"
        }
    ]
}
```

4. 点击 **保存更改**

### 2.2 `funmagic-web-users-assets-shared` 的公开读取策略

1. 进入 **S3** → **funmagic-web-users-assets-shared** → **权限** 标签页
2. 滚动到 **存储桶策略** → 点击 **编辑**
3. 粘贴：

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::funmagic-web-users-assets-shared/*"
        }
    ]
}
```

4. 点击 **保存更改**

---

## 步骤 3：配置 CORS

将此 CORS 策略应用到**所有 4 个存储桶**：

1. 进入 **S3** → **{存储桶名称}** → **权限** 标签页
2. 滚动到 **跨源资源共享 (CORS)** → 点击 **编辑**
3. 粘贴：

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
        "AllowedOrigins": [
            "http://localhost:3000",
            "http://localhost:3001",
            "https://funmagic.ai",
            "https://admin.funmagic.ai"
        ],
        "ExposeHeaders": ["ETag", "Content-Length", "Content-Type"],
        "MaxAgeSeconds": 3600
    }
]
```

4. 点击 **保存更改**

对所有 4 个存储桶重复此操作。

---

