# AWS S3 Setup Guide

This guide walks you through configuring AWS S3 for the Magiworld platform's multi-bucket architecture.

## Prerequisites

- AWS Account with admin access
- AWS Console access
- Your domain name (for CloudFront custom domain, optional)

## Architecture Overview

```
                              Admin App (3002)
                    ┌────────────────┴────────────────┐
                    │                                 │
                    ▼                                 ▼
  ┌──────────────────────────┐       ┌──────────────────────────────────┐
  │ magiworld-admin-assets   │       │       magiworld-cdn              │
  │ (Private)                │       │       (Public)                   │
  ├──────────────────────────┤       ├──────────────────────────────────┤
  │ • Admin library files    │       │ • Banners (homepage)             │
  │ • Internal documents     │       │ • Tool thumbnails & samples      │
  │ • Draft assets           │       │ • Marketing images               │
  └──────────────────────────┘       └───────────────┬──────────────────┘
                                                      │
                                                      ▼
                                               CloudFront CDN
                                                      │
  ┌──────────────────────────┐                       ▼
  │ magiworld-user-uploads   │            Web App (3000) ◄─── Users
  │ (Private)                │
  ├──────────────────────────┤
  │ • User AI inputs         │
  │ • Task results           │
  └──────────────────────────┘
```

---

## Step 1: Create S3 Buckets

### 1.1 Create `magiworld-admin-assets` (Private)

1. Go to **AWS Console** → **S3** → **Create bucket**
2. **Bucket name**: `magiworld-admin-assets` (or your unique name)
3. **AWS Region**: `ap-northeast-1` (Tokyo) or your preferred region
4. **Object Ownership**: ACLs disabled (recommended)
5. **Block Public Access**: ✅ Block *all* public access (keep all 4 checkboxes checked)
6. Click **Create bucket**

### 1.2 Create `magiworld-user-uploads` (Private)

1. **Create bucket** → **Bucket name**: `magiworld-user-uploads`
2. **Region**: Same as above
3. **Block Public Access**: ✅ Block *all* public access
4. Click **Create bucket**

### 1.3 Create `magiworld-cdn` (Public)

1. **Create bucket** → **Bucket name**: `magiworld-cdn`
2. **Region**: Same as above
3. **Block Public Access**: ⬜ **Uncheck** "Block all public access"
   - ⬜ Uncheck all 4 sub-options
   - ✅ Check "I acknowledge that the current settings might result in this bucket and the objects within becoming public"
4. Click **Create bucket**

---

## Step 2: Configure Bucket Policies

### 2.1 Set Public Read Policy for `magiworld-cdn`

1. Go to **S3** → **magiworld-cdn** → **Permissions** tab
2. Scroll to **Bucket policy** → Click **Edit**
3. Paste this policy (replace `magiworld-cdn` with your bucket name):

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::magiworld-cdn/*"
        }
    ]
}
```

4. Click **Save changes**

---

## Step 3: Configure CORS

### 3.1 CORS for `magiworld-admin-assets`

1. Go to **S3** → **magiworld-admin-assets** → **Permissions** tab
2. Scroll to **Cross-origin resource sharing (CORS)** → Click **Edit**
3. Paste:

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
        "AllowedOrigins": [
            "http://localhost:3000",
            "http://localhost:3002",
            "https://funmagic.ai",
            "https://admin.funmagic.ai"
        ],
        "ExposeHeaders": ["ETag", "Content-Length", "Content-Type"],
        "MaxAgeSeconds": 3600
    }
]
```

4. Click **Save changes**

### 3.2 CORS for `magiworld-user-uploads`

Repeat the same steps with the same CORS configuration.

### 3.3 CORS for `magiworld-cdn`

Repeat the same steps with the same CORS configuration.

---

## Step 4: Create IAM User for Admin App

### 4.1 Create IAM Policy

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
                "arn:aws:s3:::magiworld-admin-assets",
                "arn:aws:s3:::magiworld-admin-assets/*"
            ]
        },
        {
            "Sid": "CDNUploadAccess",
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject"
            ],
            "Resource": [
                "arn:aws:s3:::magiworld-cdn/banners/*",
                "arn:aws:s3:::magiworld-cdn/tools/*"
            ]
        }
    ]
}
```

3. Click **Next**
4. **Policy name**: `magiworld-admin-s3-policy`
5. Click **Create policy**

### 4.2 Create IAM User

1. Go to **IAM** → **Users** → **Create user**
2. **User name**: `magiworld-admin-app`
3. Click **Next**
4. **Permissions options**: Attach policies directly
5. Search and select `magiworld-admin-s3-policy`
6. Click **Next** → **Create user**

### 4.3 Create Access Keys

1. Click on the user **magiworld-admin-app**
2. Go to **Security credentials** tab
3. Scroll to **Access keys** → **Create access key**
4. Select **Application running outside AWS**
5. Click **Next** → **Create access key**
6. **⚠️ IMPORTANT**: Copy both values immediately:
   - **Access key ID**: `AKIA...`
   - **Secret access key**: `...`
7. Click **Done**

---

## Step 5: Create IAM User for Web App

### 5.1 Create IAM Policy

1. Go to **IAM** → **Policies** → **Create policy**
2. JSON:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "UserUploadsAccess",
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject"
            ],
            "Resource": [
                "arn:aws:s3:::magiworld-user-uploads/*"
            ]
        },
        {
            "Sid": "CDNReadAccess",
            "Effect": "Allow",
            "Action": ["s3:GetObject"],
            "Resource": ["arn:aws:s3:::magiworld-cdn/*"]
        }
    ]
}
```

3. **Policy name**: `magiworld-web-s3-policy`
4. Create policy

### 5.2 Create IAM User

1. **Create user** → **User name**: `magiworld-web-app`
2. Attach `magiworld-web-s3-policy`
3. Create access keys (same as Step 4.3)

---

## Step 6: Set Up CloudFront CDN

We need **two CloudFront distributions**:
1. **Admin Assets** - Private bucket with Origin Access Control (OAC)
2. **Public CDN** - Public bucket for banners/tools

### 6.1 CloudFront for Admin Assets (Private with OAC)

This allows serving files from the private `magiworld-admin-assets` bucket securely.

1. Go to **CloudFront** → **Create distribution**

2. **Origin settings:**
   - **Origin domain**: `magiworld-admin-assets.s3.YOUR_REGION.amazonaws.com`
   - **Origin access**: Select **Origin access control settings (recommended)**
   - Click **Create new OAC**:
     - Name: `magiworld-admin-assets-oac`
     - Signing behavior: **Sign requests (recommended)**
     - Click **Create**

3. **Default cache behavior:**
   - **Viewer protocol policy**: Redirect HTTP to HTTPS
   - **Allowed HTTP methods**: GET, HEAD
   - **Cache policy**: CachingOptimized

4. Click **Create distribution**

5. **Update S3 Bucket Policy** (CloudFront will show a banner with the policy):
   - Go to **S3** → **magiworld-admin-assets** → **Permissions** → **Bucket policy**
   - Paste the policy provided by CloudFront:

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
            "Resource": "arn:aws:s3:::magiworld-admin-assets/*",
            "Condition": {
                "StringEquals": {
                    "AWS:SourceArn": "arn:aws:cloudfront::YOUR_ACCOUNT_ID:distribution/DISTRIBUTION_ID"
                }
            }
        }
    ]
}
```

6. Note the **Distribution domain name** (e.g., `d1234admin.cloudfront.net`)

### 6.2 CloudFront for Public CDN

This serves public assets (banners, tool images) from `magiworld-cdn` bucket.

1. Go to **CloudFront** → **Create distribution**

2. **Origin settings:**
   - **Origin domain**: `magiworld-cdn.s3.YOUR_REGION.amazonaws.com`
   - **Origin access**: Public

3. **Default cache behavior:**
   - **Viewer protocol policy**: Redirect HTTP to HTTPS
   - **Cache policy**: CachingOptimized

4. **Settings:**
   - **Alternate domain name (CNAME)**: `cdn.magiworld.ai` (optional)
   - **SSL Certificate**: Request or import certificate (if using custom domain)

5. Click **Create distribution**

6. Note the **Distribution domain name** (e.g., `d5678cdn.cloudfront.net`)

### 6.3 (Optional) Configure Custom Domain

If using a custom domain like `cdn.magiworld.ai`:

1. Go to **AWS Certificate Manager (ACM)** → **Request certificate**
2. Request a public certificate for `cdn.magiworld.ai`
3. Validate via DNS (add CNAME record to your domain)
4. Once validated, go back to CloudFront distribution settings
5. Add alternate domain name and select the certificate

### 6.4 Configure Signed URLs for Admin Assets (Recommended)

Signed URLs add access control to CloudFront, requiring time-limited signatures to access files.

#### 6.4.1 Create a CloudFront Key Pair

1. Go to **CloudFront** → **Public keys** → **Create public key**

2. **Generate a key pair locally** (run in terminal):
   ```bash
   # Generate private key
   openssl genrsa -out cloudfront-private-key.pem 2048

   # Extract public key
   openssl rsa -pubout -in cloudfront-private-key.pem -out cloudfront-public-key.pem

   # View the public key (you'll paste this in AWS)
   cat cloudfront-public-key.pem
   ```

3. In AWS Console:
   - **Name**: `magiworld-admin-key`
   - **Key value**: Paste the contents of `cloudfront-public-key.pem` (including `-----BEGIN PUBLIC KEY-----` and `-----END PUBLIC KEY-----`)
   - Click **Create public key**
   - **⚠️ Copy the Key ID** (e.g., `K2XXXXXXXXXXXXXX`) - you'll need this

#### 6.4.2 Create a Key Group

1. Go to **CloudFront** → **Key groups** → **Create key group**
2. **Name**: `magiworld-admin-key-group`
3. **Public keys**: Select `magiworld-admin-key`
4. Click **Create key group**

#### 6.4.3 Configure Distribution to Require Signed URLs

1. Go to **CloudFront** → **Distributions** → Select your **admin assets distribution**
2. Go to **Behaviors** tab → Select the default behavior → **Edit**
3. Scroll to **Restrict viewer access**:
   - Select **Yes**
   - **Trusted authorization type**: Trusted key groups
   - **Trusted key groups**: Select `magiworld-admin-key-group`
4. Click **Save changes**
5. Wait for distribution to deploy (Status: "Deployed")

#### 6.4.4 Store Private Key Securely

**⚠️ IMPORTANT**: Keep the private key secure!

1. **Convert private key to single line** for environment variable:
   ```bash
   # This creates a single-line version with \n escaped
   awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' cloudfront-private-key.pem
   ```

2. **Add to `.env.local`**:
   ```bash
   CLOUDFRONT_KEY_PAIR_ID=K2XXXXXXXXXXXXXX
   CLOUDFRONT_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIE...your-key...==\n-----END RSA PRIVATE KEY-----\n"
   ```

3. **Delete the local key files** after copying to env:
   ```bash
   rm cloudfront-private-key.pem cloudfront-public-key.pem
   ```

#### 6.4.5 Test Signed URLs

After configuring, unsigned URLs will return **403 Forbidden**:
```
https://d1234admin.cloudfront.net/abc123.jpg  → 403 Forbidden
```

Only signed URLs work:
```
https://d1234admin.cloudfront.net/abc123.jpg?Expires=...&Signature=...&Key-Pair-Id=...  → 200 OK
```

---

## Step 7: (Optional) Set Up Lifecycle Policies

### 7.1 Auto-delete Temporary User Uploads

1. Go to **S3** → **magiworld-user-uploads** → **Management** tab
2. Click **Create lifecycle rule**
3. **Rule name**: `DeleteTempUploads`
4. **Rule scope**: Limit the scope using filters
5. **Prefix**: `temp/`
6. **Lifecycle rule actions**: ✅ Expire current versions of objects
7. **Days after object creation**: `1`
8. Click **Create rule**

### 7.2 Auto-delete Old User Uploads

1. Create another lifecycle rule
2. **Rule name**: `DeleteOldUserUploads`
3. **Prefix**: `uploads/`
4. **Days after object creation**: `30`
5. Click **Create rule**

---

## Step 8: Configure Environment Variables

### Admin App (`apps/admin/.env.local`)

```bash
# AWS S3 Configuration
AWS_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=AKIA...your-admin-key
AWS_SECRET_ACCESS_KEY=...your-admin-secret
S3_BUCKET_NAME=magiworld-admin-assets
S3_CDN_BUCKET=magiworld-cdn

# CloudFront URL for admin assets (private bucket via OAC)
CLOUDFRONT_ADMIN_URL=https://d1234admin.cloudfront.net

# CloudFront Signed URLs (for admin assets access control)
CLOUDFRONT_KEY_PAIR_ID=K2XXXXXXXXXXXXXX
CLOUDFRONT_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIE...your-key...==\n-----END RSA PRIVATE KEY-----\n"
CLOUDFRONT_SIGNED_URL_EXPIRY=3600

# CloudFront URL for public CDN (banners, tools)
CLOUDFRONT_URL=https://d5678cdn.cloudfront.net
# Or if using custom domain:
# CLOUDFRONT_URL=https://cdn.magiworld.ai
```

### Web App (`apps/web/.env.local`)

```bash
# AWS S3 Configuration
AWS_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=AKIA...your-web-key
AWS_SECRET_ACCESS_KEY=...your-web-secret
S3_BUCKET_NAME=magiworld-user-uploads

# CloudFront URL
CLOUDFRONT_URL=https://d1234567890.cloudfront.net
```

---

## Step 9: Test the Configuration

### 9.1 Test Admin Library Upload

```bash
# Start admin app
pnpm dev:admin
```

1. Go to `http://localhost:3002/assets`
2. Create a folder and upload an image
3. Check AWS Console → S3 → `magiworld-admin-assets` → Verify file exists

### 9.2 Test CDN Banner Upload

1. Go to Admin → Banners → Add Banner
2. Upload a banner image
3. Check AWS Console → S3 → `magiworld-cdn/banners/` → Verify file exists
4. Copy the S3 object URL and verify it's publicly accessible:
   - Direct S3: `https://magiworld-cdn.s3.ap-northeast-1.amazonaws.com/banners/your-file.jpg`
   - CloudFront: `https://d1234567890.cloudfront.net/banners/your-file.jpg`

---

## Quick Checklist

| Step | Task | Status |
|------|------|--------|
| 1.1 | Create `magiworld-admin-assets` bucket (private) | ⬜ |
| 1.2 | Create `magiworld-user-uploads` bucket (private) | ⬜ |
| 1.3 | Create `magiworld-cdn` bucket (public) | ⬜ |
| 2.1 | Add public bucket policy to `magiworld-cdn` | ⬜ |
| 3.1 | Configure CORS on `magiworld-admin-assets` | ⬜ |
| 3.2 | Configure CORS on `magiworld-user-uploads` | ⬜ |
| 3.3 | Configure CORS on `magiworld-cdn` | ⬜ |
| 4.1 | Create `magiworld-admin-s3-policy` IAM policy | ⬜ |
| 4.2 | Create `magiworld-admin-app` IAM user | ⬜ |
| 4.3 | Create access keys for admin user | ⬜ |
| 5.1 | Create `magiworld-web-s3-policy` IAM policy | ⬜ |
| 5.2 | Create `magiworld-web-app` IAM user + access keys | ⬜ |
| 6.1 | Create CloudFront distribution for admin assets (with OAC) | ⬜ |
| 6.2 | Create CloudFront distribution for public CDN | ⬜ |
| 6.4.1 | Create CloudFront key pair for signed URLs | ⬜ |
| 6.4.2 | Create key group for signed URLs | ⬜ |
| 6.4.3 | Configure distribution to require signed URLs | ⬜ |
| 6.4.4 | Add private key to `.env.local` | ⬜ |
| 7 | (Optional) Set up lifecycle policies | ⬜ |
| 8 | Configure `.env.local` files | ⬜ |
| 9.1 | Test library upload in admin app | ⬜ |
| 9.2 | Test CDN banner upload | ⬜ |

---

## Troubleshooting

### "Access Denied" when uploading

1. Verify IAM policy is attached to the user
2. Check bucket name matches in policy and `.env.local`
3. Verify access key ID and secret are correct

### CORS errors in browser

1. Verify CORS is configured on all buckets
2. Check `AllowedOrigins` includes your domain
3. Clear browser cache and retry

### CloudFront not serving updated files

1. Files use cache-busted filenames (timestamp in name)
2. If needed, create invalidation: CloudFront → Distribution → Invalidations → Create → Path: `/*`

### Files not appearing in S3

1. Check browser console for upload errors
2. Verify AWS credentials are set in `.env.local`
3. Restart dev server after changing env vars

---

## Security Best Practices

1. **Never commit AWS credentials** to git
2. **Use separate IAM users** for each app (admin vs web)
3. **Restrict bucket policies** to minimum required permissions
4. **Enable S3 versioning** for important buckets (optional)
5. **Set up CloudTrail** for audit logging (production)
6. **Rotate access keys** periodically
