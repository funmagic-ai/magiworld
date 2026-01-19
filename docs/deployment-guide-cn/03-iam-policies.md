## 步骤 4：创建 IAM 用户和策略

> **关键提示：不要在应用程序中使用 AWS root 用户凭证。**
>
> Root 用户对您的整个 AWS 账户拥有无限制访问权限。如果凭证泄露：
> - 攻击者可以删除所有资源
> - 攻击者可以创建昂贵的 EC2 实例
> - 攻击者可以访问账单和付款信息
> - 攻击者可以将您锁定在自己的账户之外
>
> 始终创建具有最小所需权限的专用 IAM 用户。

### 4.1 创建管理员应用 IAM 策略

1. 进入 **IAM** → **策略** → **创建策略**
2. 点击 **JSON** 标签页并粘贴：

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AdminAssetsFullAccess",
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::funmagic-admin-users-assets",
                "arn:aws:s3:::funmagic-admin-users-assets/*"
            ]
        },
        {
            "Sid": "PublicAssetsAccess",
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject"
            ],
            "Resource": [
                "arn:aws:s3:::funmagic-web-public-assets",
                "arn:aws:s3:::funmagic-web-public-assets/*"
            ]
        },
        {
            "Sid": "PublicAssetsListBucket",
            "Effect": "Allow",
            "Action": "s3:ListBucket",
            "Resource": "arn:aws:s3:::funmagic-web-public-assets"
        }
    ]
}
```

3. 点击 **Next**
4. **策略名称**：`funmagic-admin-s3-policy`
5. 点击 **Create policy**

### 4.2 创建管理员应用 IAM 用户

1. 进入 **IAM** → **Users** → **Create user**
2. **用户名**：`funmagic-admin-app`
3. 点击 **Next**
4. **权限选项**：直接附加策略
5. 搜索并选择 `funmagic-admin-s3-policy`
6. 点击 **Next** → **Create user**

### 4.3 创建管理员应用访问密钥

1. 点击用户 **funmagic-admin-app**
2. 进入 **Security credentials** 标签页
3. 滚动到 **Access keys** → **Create access key**
4. 选择 **Application running outside AWS**
5. 点击 **Next** → **Create access key**
6. **重要提示**：立即复制两个值：
   - **访问密钥 ID**：`AKIA...`
   - **秘密访问密钥**：`...`
7. 点击 **Done**

### 4.4 创建 Web 应用 IAM 策略

1. 进入 **IAM** → **Policies** → **Create policy**
2. JSON：

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "WebPrivateAccess",
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::funmagic-web-users-assets-private",
                "arn:aws:s3:::funmagic-web-users-assets-private/*"
            ]
        },
        {
            "Sid": "WebSharedAccess",
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::funmagic-web-users-assets-shared",
                "arn:aws:s3:::funmagic-web-users-assets-shared/*"
            ]
        },
        {
            "Sid": "PublicAssetsRead",
            "Effect": "Allow",
            "Action": ["s3:GetObject"],
            "Resource": ["arn:aws:s3:::funmagic-web-public-assets/*"]
        }
    ]
}
```

3. **策略名称**：`funmagic-web-s3-policy`
4. 创建策略

### 4.5 创建 Web 应用 IAM 用户

1. **创建用户** → **用户名**：`funmagic-web-app`
2. 附加 `funmagic-web-s3-policy`
3. 创建访问密钥（与步骤 4.3 相同）

### 4.6 删除 Root 用户访问密钥（如果您之前使用过）

如果您之前使用了 root 凭证：

1. 进入 **AWS 控制台** → 点击右上角您的账户名 → **Security credentials**
2. 滚动到 **Access keys**
3. **删除**您在应用程序中使用的任何 root 访问密钥
4. 使用新的 IAM 用户凭证更新您的 `.env.local` 文件

---

