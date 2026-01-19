## Step 4: Create IAM Users and Policies

> **CRITICAL: Do NOT use AWS root user credentials in your applications.**
>
> Root user has unlimited access to your entire AWS account. If credentials leak:
> - Attacker can delete all resources
> - Attacker can create expensive EC2 instances
> - Attacker can access billing and payment info
> - Attacker can lock you out of your own account
>
> Always create dedicated IAM users with minimal required permissions.

### 4.1 Create Admin App IAM Policy

1. Go to **IAM** → **Policies** → **Create policy**
2. Click **JSON** tab and paste:

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

3. Click **Next**
4. **Policy name**: `funmagic-admin-s3-policy`
5. Click **Create policy**

### 4.2 Create Admin App IAM User

1. Go to **IAM** → **Users** → **Create user**
2. **User name**: `funmagic-admin-app`
3. Click **Next**
4. **Permissions options**: Attach policies directly
5. Search and select `funmagic-admin-s3-policy`
6. Click **Next** → **Create user**

### 4.3 Create Admin App Access Keys

1. Click on the user **funmagic-admin-app**
2. Go to **Security credentials** tab
3. Scroll to **Access keys** → **Create access key**
4. Select **Application running outside AWS**
5. Click **Next** → **Create access key**
6. **IMPORTANT**: Copy both values immediately:
   - **Access key ID**: `AKIA...`
   - **Secret access key**: `...`
7. Click **Done**

### 4.4 Create Web App IAM Policy

1. Go to **IAM** → **Policies** → **Create policy**
2. JSON:

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

3. **Policy name**: `funmagic-web-s3-policy`
4. Create policy

### 4.5 Create Web App IAM User

1. **Create user** → **User name**: `funmagic-web-app`
2. Attach `funmagic-web-s3-policy`
3. Create access keys (same as Step 4.3)

### 4.6 Delete Root User Access Keys (If You Were Using Them)

If you previously used root credentials:

1. Go to **AWS Console** → Click your account name (top right) → **Security credentials**
2. Scroll to **Access keys**
3. **Delete** any root access keys you were using in your application
4. Update your `.env.local` files with the new IAM user credentials

---

