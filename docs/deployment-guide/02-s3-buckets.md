## Step 1: Create S3 Buckets

### 1.1 Create `funmagic-admin-users-assets` (Private)

1. Go to **AWS Console** → **S3** → **Create bucket**
2. **Bucket name**: `funmagic-admin-users-assets` (or your unique name with prefix)
3. **AWS Region**: `us-east-2` (Ohio) or your preferred region
4. **Object Ownership**: ACLs disabled (recommended)
5. **Block Public Access**: ✅ Block *all* public access (keep all 4 checkboxes checked)
6. Click **Create bucket**

### 1.2 Create `funmagic-web-public-assets` (Public)

1. **Create bucket** → **Bucket name**: `funmagic-web-public-assets`
2. **Region**: Same as above
3. **Block Public Access**: ⬜ **Uncheck** "Block all public access"
   - ⬜ Uncheck all 4 sub-options
   - ✅ Check "I acknowledge that the current settings might result in this bucket and the objects within becoming public"
4. Click **Create bucket**

### 1.3 Create `funmagic-web-users-assets-private` (Private)

1. **Create bucket** → **Bucket name**: `funmagic-web-users-assets-private`
2. **Region**: Same as above
3. **Block Public Access**: ✅ Block *all* public access
4. Click **Create bucket**

### 1.4 Create `funmagic-web-users-assets-shared` (Public)

1. **Create bucket** → **Bucket name**: `funmagic-web-users-assets-shared`
2. **Region**: Same as above
3. **Block Public Access**: ⬜ **Uncheck** "Block all public access"
4. Click **Create bucket**

---

## Step 2: Configure Bucket Policies

### 2.1 Public Read Policy for `funmagic-web-public-assets`

1. Go to **S3** → **funmagic-web-public-assets** → **Permissions** tab
2. Scroll to **Bucket policy** → Click **Edit**
3. Paste:

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

4. Click **Save changes**

### 2.2 Public Read Policy for `funmagic-web-users-assets-shared`

1. Go to **S3** → **funmagic-web-users-assets-shared** → **Permissions** tab
2. Scroll to **Bucket policy** → Click **Edit**
3. Paste:

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

4. Click **Save changes**

---

## Step 3: Configure CORS

Apply this CORS policy to **all 4 buckets**:

1. Go to **S3** → **{bucket-name}** → **Permissions** tab
2. Scroll to **Cross-origin resource sharing (CORS)** → Click **Edit**
3. Paste:

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

4. Click **Save changes**

Repeat for all 4 buckets.

---
