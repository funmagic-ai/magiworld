# Deployment Guide

This guide walks you through deploying the Magiworld platform including AWS S3, CloudFront, Cloudflare DNS, and AWS ECS.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Step 1: Create S3 Buckets](#step-1-create-s3-buckets)
4. [Step 2: Configure Bucket Policies](#step-2-configure-bucket-policies)
5. [Step 3: Configure CORS](#step-3-configure-cors)
6. [Step 4: Create IAM Users and Policies](#step-4-create-iam-users-and-policies)
7. [Step 5: Set Up CloudFront Distributions](#step-5-set-up-cloudfront-distributions)
8. [Step 6: Configure Signed URLs](#step-6-configure-signed-urls)
9. [Step 7: Set Up Lifecycle Policies](#step-7-set-up-lifecycle-policies)
10. [Step 8: Configure Cloudflare DNS](#step-8-configure-cloudflare-dns)
11. [Step 9: Set Up AWS RDS PostgreSQL](#step-9-set-up-aws-rds-postgresql)
12. [Step 10: Deploy to AWS EC2 with Docker](#step-10-deploy-to-aws-ec2-with-docker)
13. [Step 11: Configure Environment Variables](#step-11-configure-environment-variables)
14. [Step 12: Test the Configuration](#step-12-test-the-configuration)
15. [Quick Checklist](#quick-checklist)
16. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- AWS Account with admin access
- AWS CLI installed and configured
- Cloudflare account with your domain added
- SSH key pair created in AWS EC2 console
- Your domain name (e.g., `funmagic.ai`)

> **IMPORTANT: Never Use Root User for Applications**
>
> Using AWS root user credentials in your application is a critical security risk:
> - Root user has **unlimited access** to your entire AWS account
> - A credential leak could result in **total account compromise**
> - Root user cannot be restricted by IAM policies
>
> Always create dedicated IAM users with minimal permissions for each application.

---

## Architecture Overview

Magiworld uses 4 S3 buckets with CloudFront CDN:

| Bucket | Purpose | Access | CloudFront |
|--------|---------|--------|------------|
| `funmagic-admin-users-assets` | Admin library & Magi-generated files | Private | OAC + Signed URLs |
| `funmagic-web-public-assets` | Banners, tool thumbnails, UI assets | Public | Public CDN |
| `funmagic-web-users-assets-private` | Web user uploads & AI results | Private | OAC + Signed URLs |
| `funmagic-web-users-assets-shared` | User-shared files (public links) | Public | Public CDN |

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Complete Infrastructure Architecture                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│                              Cloudflare DNS                                  │
│                    ┌─────────────────────────────────┐                       │
│                    │  funmagic.ai      → EC2 (web)   │                       │
│                    │  admin.funmagic.ai → EC2 (admin)│                       │
│                    │  cdn.funmagic.ai   → CloudFront │                       │
│                    │  shared.funmagic.ai→ CloudFront │                       │
│                    └─────────────────────────────────┘                       │
│                                    │                                          │
│                    ┌───────────────┼───────────────┐                         │
│                    ▼               ▼               ▼                         │
│              ┌─────────────────────────┐   ┌──────────────┐                  │
│              │      AWS EC2            │   │  CloudFront  │                  │
│              │  ┌───────┐ ┌───────┐   │   │ Distributions│                  │
│              │  │ Web   │ │ Admin │   │   └──────┬───────┘                  │
│              │  │ :3000 │ │ :3001 │   │          │                          │
│              │  └───────┘ └───────┘   │          │                          │
│              │      Nginx + Docker    │          │                          │
│              └────────────┬───────────┘          │                          │
│                           └──────────────────────┘                          │
│                                  ▼                                           │
│   ┌────────────────────────────────────────────────────────────────────────┐ │
│   │                           S3 Buckets                                   │ │
│   │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐          │ │
│   │  │ admin_     │ │ public_    │ │ web_users_ │ │ web_users_ │          │ │
│   │  │ users_     │ │ assets     │ │ assets_    │ │ assets_    │          │ │
│   │  │ assets     │ │            │ │ private    │ │ shared     │          │ │
│   │  │ (Private)  │ │ (Public)   │ │ (Private)  │ │ (Public)   │          │ │
│   │  └────────────┘ └────────────┘ └────────────┘ └────────────┘          │ │
│   └────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Folder Structure

```
funmagic-admin-users-assets/
└── {userid}/
    └── library/
        ├── upload/{yyyymmdd}/{filename}
        └── generated/{tool-slug}/{yyyymmdd}/{filename}

funmagic-web-public-assets/
├── banners/main/{name}-{timestamp}.jpg
├── banners/side/{name}-{timestamp}.jpg
├── tools/{tool-slug}/thumbnail/{filename}
├── tools/{tool-slug}/page_banner/{filename}
├── ui/{icons, placeholders}
└── fonts/{custom-fonts}

funmagic-web-users-assets-private/
└── {userid}/
    └── {tool-slug}/
        ├── upload/{yyyymmdd}/{filename}
        └── generated/{yyyymmdd}/{filename}

funmagic-web-users-assets-shared/
└── {userid}/
    └── {share-id}/
        ├── {filename}
        └── metadata.json
```

---

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
                "arn:aws:s3:::funmagic-web-public-assets/banners/*",
                "arn:aws:s3:::funmagic-web-public-assets/tools/*",
                "arn:aws:s3:::funmagic-web-public-assets/ui/*",
                "arn:aws:s3:::funmagic-web-public-assets/fonts/*"
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

## Step 5: Set Up CloudFront Distributions

We need **4 CloudFront distributions**:

| Distribution | Origin Bucket | Access Control |
|--------------|---------------|----------------|
| `funmagic-cf-admin-private` | `funmagic-admin-users-assets` | OAC + Signed URLs |
| `funmagic-cf-public` | `funmagic-web-public-assets` | Public |
| `funmagic-cf-web-private` | `funmagic-web-users-assets-private` | OAC + Signed URLs |
| `funmagic-cf-web-shared` | `funmagic-web-users-assets-shared` | Public |

### 5.1 CloudFront for `funmagic-admin-users-assets` (Private with OAC)

1. Go to **CloudFront** → **Create distribution**

2. **Origin settings:**
   - **Origin domain**: `funmagic-admin-users-assets.s3.us-east-2.amazonaws.com`
   - **Origin access**: Select **Origin access control settings (recommended)**
   - Click **Create new OAC**:
     - Name: `funmagic-admin-users-assets-oac`
     - Signing behavior: **Sign requests (recommended)**
     - Click **Create**

3. **Default cache behavior:**
   - **Viewer protocol policy**: Redirect HTTP to HTTPS
   - **Allowed HTTP methods**: GET, HEAD
   - **Cache policy**: CachingOptimized

4. Click **Create distribution**

5. **Update S3 Bucket Policy** (CloudFront will show a banner with the policy):
   - Go to **S3** → **funmagic-admin-users-assets** → **Permissions** → **Bucket policy**
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

6. Note the **Distribution domain name** (e.g., `d1234admin.cloudfront.net`)

### 5.2 CloudFront for `funmagic-web-public-assets` (Public)

1. Go to **CloudFront** → **Create distribution**

2. **Origin settings:**
   - **Origin domain**: `funmagic-web-public-assets.s3.us-east-2.amazonaws.com`
   - **Origin access**: Public

3. **Default cache behavior:**
   - **Viewer protocol policy**: Redirect HTTP to HTTPS
   - **Cache policy**: CachingOptimized

4. **Settings:**
   - **Alternate domain name (CNAME)**: `cdn.funmagic.ai` (optional, configure later)
   - **SSL Certificate**: Request or import certificate (if using custom domain)

5. Click **Create distribution**

6. Note the **Distribution domain name** (e.g., `d5678cdn.cloudfront.net`)

### 5.3 CloudFront for `funmagic-web-users-assets-private` (Private with OAC)

Repeat steps from 5.1 with:
- **Origin domain**: `funmagic-web-users-assets-private.s3.us-east-2.amazonaws.com`
- **OAC name**: `funmagic-web-users-assets-private-oac`

Update the S3 bucket policy for `funmagic-web-users-assets-private`:

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

### 5.4 CloudFront for `funmagic-web-users-assets-shared` (Public)

Repeat steps from 5.2 with:
- **Origin domain**: `funmagic-web-users-assets-shared.s3.us-east-2.amazonaws.com`
- **Alternate domain name (CNAME)**: `shared.funmagic.ai` (optional)

---

## Step 6: Configure Signed URLs

Signed URLs are required for private buckets (`funmagic-admin-users-assets` and `funmagic-web-users-assets-private`).

### 6.1 Create a CloudFront Key Pair

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
   - **Name**: `funmagic-signing-key`
   - **Key value**: Paste the contents of `cloudfront-public-key.pem` (including headers)
   - Click **Create public key**
   - **Copy the Key ID** (e.g., `K2XXXXXXXXXXXXXX`)

### 6.2 Create a Key Group

1. Go to **CloudFront** → **Key groups** → **Create key group**
2. **Name**: `funmagic-key-group`
3. **Public keys**: Select `funmagic-signing-key`
4. Click **Create key group**

### 6.3 Configure Distributions to Require Signed URLs

For both `funmagic-cf-admin-private` and `funmagic-cf-web-private` distributions:

1. Go to **CloudFront** → **Distributions** → Select distribution
2. Go to **Behaviors** tab → Select default behavior → **Edit**
3. Scroll to **Restrict viewer access**:
   - Select **Yes**
   - **Trusted authorization type**: Trusted key groups
   - **Trusted key groups**: Select `funmagic-key-group`
4. Click **Save changes**
5. Wait for distribution to deploy (Status: "Deployed")

### 6.4 Store Private Key Securely

1. **Convert private key to single line** for environment variable:
   ```bash
   # This creates a single-line version with \n escaped
   awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' cloudfront-private-key.pem
   ```

2. **Add to `.env.local`** (see Step 10)

3. **Delete the local key files** after copying to env:
   ```bash
   rm cloudfront-private-key.pem cloudfront-public-key.pem
   ```

---

## Step 7: Set Up Lifecycle Policies

### 7.1 Lifecycle for `funmagic-web-users-assets-private`

1. Go to **S3** → **funmagic-web-users-assets-private** → **Management** tab
2. Click **Create lifecycle rule**

**Rule 1: Delete old uploads**
- **Rule name**: `DeleteOldUploads`
- **Rule scope**: Limit the scope using filters
- **Prefix**: Leave empty or use specific path
- **Filter by tags**: None
- **Lifecycle rule actions**: ✅ Expire current versions of objects
- **Days after object creation**: `30`
- Click **Create rule**

**Rule 2: Abort incomplete multipart uploads**
1. Create another lifecycle rule
2. **Rule name**: `AbortIncompleteMultipart`
3. **Lifecycle rule actions**: ✅ Delete expired object delete markers or incomplete multipart uploads
4. **Days after initiation**: `1`
5. Click **Create rule**

---

## Step 8: Configure Cloudflare DNS

Cloudflare provides DNS management, DDoS protection, and CDN caching for your domain.

### 8.1 Add Your Domain to Cloudflare

**Step 1: Create Cloudflare Account and Add Site**

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Create an account or log in
3. Click **Add a Site** → Enter your domain: `funmagic.ai`
4. Select a plan (Free plan works for most cases)
5. Click **Continue**

**Step 2: Review DNS Records (IMPORTANT for Email)**

1. Cloudflare will scan your existing DNS records from GoDaddy
2. **Verify your email records are imported** - Look for:
   - MX records (mail servers)
   - TXT records (SPF, DKIM, DMARC)
   - CNAME records (mail.funmagic.ai, etc.)
3. If any records are missing, add them manually before proceeding
4. Click **Continue**

> **WARNING**: If you use Google Workspace email, make sure all MX records are imported. Missing MX records = email stops working!

**Step 3: Note Your Cloudflare Nameservers**

Cloudflare will assign you two nameservers. They look like:
```
ada.ns.cloudflare.com
bob.ns.cloudflare.com
```
> **Important**: Write these down - you'll need them in the next step.

**Step 4: Update Nameservers in GoDaddy**

1. Log in to [GoDaddy](https://www.godaddy.com/)
2. Go to **My Products** → Find `funmagic.ai` → Click **DNS** or **Manage**
3. Scroll down to **Nameservers** section
4. Click **Change** (next to "Using default nameservers")
5. Select **Enter my own nameservers (advanced)**
6. Enter the Cloudflare nameservers:
   - Nameserver 1: `ada.ns.cloudflare.com` (use YOUR assigned nameserver)
   - Nameserver 2: `bob.ns.cloudflare.com` (use YOUR assigned nameserver)
7. Click **Save**
8. Confirm the change when prompted

**Step 5: Verify in Cloudflare**

1. Go back to Cloudflare Dashboard
2. Click **Done, check nameservers**
3. Wait for propagation (usually 10 minutes to 24 hours)
4. Cloudflare will email you when your site is active

> **Note**: While waiting for propagation, you can still configure DNS records in Cloudflare. They'll become active once nameservers propagate.

**Step 6: Disable DNSSEC in GoDaddy (If Enabled)**

If you have DNSSEC enabled in GoDaddy, you must disable it before changing nameservers:

1. In GoDaddy → **DNS** → **DNSSEC**
2. Turn off DNSSEC
3. Wait 24-48 hours before changing nameservers
4. You can re-enable DNSSEC in Cloudflare after migration

### 8.2 Preserve Google Workspace Email Records

If you're using Google Workspace (Gmail) for email, ensure these records exist in Cloudflare:

**MX Records (Required for receiving email)**

| Type | Name | Mail Server | Priority |
|------|------|-------------|----------|
| MX | `@` | `aspmx.l.google.com` | 1 |
| MX | `@` | `alt1.aspmx.l.google.com` | 5 |
| MX | `@` | `alt2.aspmx.l.google.com` | 5 |
| MX | `@` | `alt3.aspmx.l.google.com` | 10 |
| MX | `@` | `alt4.aspmx.l.google.com` | 10 |

**SPF Record (Required for sending email)**

| Type | Name | Content |
|------|------|---------|
| TXT | `@` | `v=spf1 include:_spf.google.com ~all` |

**DKIM Record (For email authentication)**

Get this from: Google Admin Console → Apps → Google Workspace → Gmail → Authenticate email

| Type | Name | Content |
|------|------|---------|
| TXT | `google._domainkey` | `v=DKIM1; k=rsa; p=YOUR_DKIM_KEY` |

**DMARC Record (Optional but recommended)**

| Type | Name | Content |
|------|------|---------|
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:admin@funmagic.ai` |

**How to Add MX Records in Cloudflare:**

1. Go to **Cloudflare Dashboard** → **funmagic.ai** → **DNS** → **Records**
2. Click **Add record**
3. **Type**: MX
4. **Name**: `@` (represents funmagic.ai)
5. **Mail server**: `aspmx.l.google.com`
6. **Priority**: 1
7. **Proxy status**: DNS only (MX records cannot be proxied)
8. Click **Save**
9. Repeat for remaining MX records

**Verify Email is Working:**

After nameservers propagate, test by:
1. Send an email TO your funmagic.ai address from Gmail/external
2. Send an email FROM your funmagic.ai address
3. Use [MXToolbox](https://mxtoolbox.com/SuperTool.aspx?action=mx:funmagic.ai) to verify MX records

### 8.3 Configure DNS Records for CloudFront

Add CNAME records for your CloudFront distributions:

| Type | Name | Target | Proxy Status |
|------|------|--------|--------------|
| CNAME | `cdn` | `d5678cdn.cloudfront.net` | DNS only (gray cloud) |
| CNAME | `shared` | `d9012shared.cloudfront.net` | DNS only (gray cloud) |

> **Important**: For CloudFront CNAMEs, set Proxy Status to **DNS only** (gray cloud icon). CloudFront handles SSL and caching, so Cloudflare proxy would cause conflicts.

### 8.4 Configure DNS Records for AWS EC2 (Application)

For your main application domains pointing to your EC2 instance:

| Type | Name | Content | Proxy Status |
|------|------|---------|--------------|
| A | `@` | `YOUR_EC2_ELASTIC_IP` | Proxied (orange cloud) |
| A | `www` | `YOUR_EC2_ELASTIC_IP` | Proxied (orange cloud) |
| A | `admin` | `YOUR_EC2_ELASTIC_IP` | Proxied (orange cloud) |

> **Note**: Using A records (not CNAME) because we have a static Elastic IP. Get your IP from EC2 → Elastic IPs.

### 8.5 Configure CloudFront to Accept Custom Domains

For each CloudFront distribution using a custom domain:

1. **Request SSL Certificate in AWS Certificate Manager (ACM)**:
   - Go to **ACM** → **Request certificate** (must be in `us-east-1` for CloudFront)
   - **Domain names**: `cdn.funmagic.ai`, `shared.funmagic.ai`
   - **Validation method**: DNS validation
   - Click **Request**

2. **Add DNS Validation Records in Cloudflare**:
   - ACM will provide CNAME records for validation
   - Add these in Cloudflare (DNS only, gray cloud)
   - Wait for validation (usually 5-30 minutes)

3. **Update CloudFront Distribution**:
   - Go to **CloudFront** → Distribution → **Edit**
   - **Alternate domain names (CNAMEs)**: Add `cdn.funmagic.ai`
   - **Custom SSL certificate**: Select the ACM certificate
   - Click **Save changes**

### 8.6 Cloudflare SSL/TLS Settings

1. Go to **Cloudflare Dashboard** → Your domain → **SSL/TLS**
2. Set encryption mode to **Full (strict)**
3. Go to **Edge Certificates** → Enable **Always Use HTTPS**

### 8.7 Cloudflare Page Rules (Optional)

For caching static assets:

1. Go to **Rules** → **Page Rules** → **Create Page Rule**
2. URL: `cdn.funmagic.ai/*`
3. Settings:
   - Cache Level: Cache Everything
   - Edge Cache TTL: 1 month
4. Click **Save and Deploy**

---

## Step 9: Set Up AWS RDS PostgreSQL

AWS RDS provides a managed PostgreSQL database with automatic backups, updates, and high availability.

### 9.1 Create a Database Security Group

1. Go to **EC2** → **Security Groups** → **Create security group**
2. **Name**: `funmagic-rds-sg`
3. **Description**: Security group for Funmagic RDS instance
4. **VPC**: Default VPC (same as your EC2 instance)
5. **Inbound rules**:

| Type | Port | Source | Description |
|------|------|--------|-------------|
| PostgreSQL | 5432 | `funmagic-ec2-sg` | Allow EC2 to connect |
| PostgreSQL | 5432 | Your IP | Allow local development (optional) |

> **Note**: For local development access, add your home/office IP. Remove this rule in production for security.

6. **Outbound rules**: Keep default (all traffic allowed)
7. Click **Create security group**

### 9.2 Create RDS PostgreSQL Instance

1. Go to **RDS** → **Create database**
2. **Engine options**:
   - **Engine type**: PostgreSQL
   - **Version**: PostgreSQL 16.x (or latest stable)
3. **Templates**: Choose **Free tier** (for testing) or **Production**
4. **Settings**:
   - **DB instance identifier**: `funmagic-db`
   - **Master username**: `postgres` (or your preferred username)
   - **Master password**: Generate a strong password and **save it securely**
5. **Instance configuration**:
   - **Free tier**: `db.t3.micro` (1 vCPU, 1GB RAM)
   - **Production**: `db.t3.small` or `db.t3.medium`
6. **Storage**:
   - **Storage type**: gp3
   - **Allocated storage**: 20 GB (minimum)
   - **Enable storage autoscaling**: ✅ Check this
   - **Maximum storage threshold**: 100 GB
7. **Connectivity**:
   - **VPC**: Default VPC
   - **Public access**: **No** (for security) or **Yes** (for local dev access)
   - **VPC security group**: Select `funmagic-rds-sg`
   - **Availability Zone**: No preference
8. **Database authentication**: Password authentication
9. **Additional configuration**:
   - **Initial database name**: `funmagic`
   - **Enable automated backups**: ✅ Yes
   - **Backup retention period**: 7 days
   - **Enable deletion protection**: ✅ Yes (for production)
10. Click **Create database**

> **Wait 5-10 minutes** for the database to be created and become "Available".

### 9.3 Get the Connection Endpoint

1. Go to **RDS** → **Databases** → Click on `funmagic-db`
2. Find the **Endpoint** in the "Connectivity & security" section
   - Example: `funmagic-db.abc123xyz.us-east-2.rds.amazonaws.com`
3. Note the **Port**: `5432` (default)

### 9.4 Build Your Connection String

Your `DATABASE_URL` follows this format:

```
postgresql://USERNAME:PASSWORD@ENDPOINT:PORT/DATABASE
```

**Example**:
```
postgresql://postgres:YourSecurePassword123@funmagic-db.abc123xyz.us-east-2.rds.amazonaws.com:5432/funmagic
```

### 9.5 Test the Connection

**From your local machine** (if public access enabled):

```bash
# Install psql if not installed
# macOS: brew install postgresql
# Ubuntu: sudo apt install postgresql-client

# Test connection
psql "postgresql://postgres:YourPassword@funmagic-db.abc123xyz.us-east-2.rds.amazonaws.com:5432/funmagic"

# If connected successfully, you'll see:
# funmagic=>
```

**From EC2** (after EC2 is set up):

```bash
# SSH into EC2
ssh -i your-key.pem ec2-user@YOUR_EC2_IP

# Install psql
sudo dnf install postgresql15 -y  # Amazon Linux 2023
# sudo apt install postgresql-client -y  # Ubuntu

# Test connection
psql "postgresql://postgres:YourPassword@funmagic-db.abc123xyz.us-east-2.rds.amazonaws.com:5432/funmagic"
```

### 9.6 Initialize the Database Schema

This project uses **Drizzle ORM** for database management.

**Option A: Run Drizzle migrations from local machine**

If you have public access enabled on RDS:

```bash
# Set the DATABASE_URL in your .env.local (in packages/db directory)
DATABASE_URL=postgresql://postgres:YourPassword@funmagic-db.abc123xyz.us-east-2.rds.amazonaws.com:5432/funmagic

# Navigate to db package
cd packages/db

# Option 1: Push schema directly (recommended for initial setup)
pnpm db:push

# Option 2: Run migrations (if you have generated migration files)
pnpm db:migrate
```

**Option B: Run Drizzle migrations from EC2**

If RDS has no public access:

```bash
# SSH into EC2
ssh -i your-key.pem ec2-user@YOUR_EC2_IP

# Clone your repo or copy the packages/db folder
cd ~/funmagic

# Install Node.js if not installed
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install nodejs -y

# Install pnpm
npm install -g pnpm

# Set DATABASE_URL
export DATABASE_URL="postgresql://postgres:YourPassword@funmagic-db.abc123xyz.us-east-2.rds.amazonaws.com:5432/funmagic"

# Install dependencies and run migrations
cd packages/db
pnpm install
pnpm db:push
```

**Available Drizzle commands:**

| Command | Description |
|---------|-------------|
| `pnpm db:push` | Push schema directly to database (recommended for dev/initial setup) |
| `pnpm db:generate` | Generate migration files from schema changes |
| `pnpm db:migrate` | Apply generated migration files |
| `pnpm db:studio` | Open Drizzle Studio to browse database |

### 9.7 Update Environment Variables

Update your `.env.local` files with the RDS connection string:

**Local development** (`apps/web/.env.local` and `apps/admin/.env.local`):

```bash
# For local dev with public RDS access
DATABASE_URL=postgresql://postgres:YourPassword@funmagic-db.abc123xyz.us-east-2.rds.amazonaws.com:5432/funmagic

# OR keep using local PostgreSQL for development
DATABASE_URL=postgresql://postgres:password@localhost:5432/funmagic
```

**Production** (`.env.web` and `.env.admin` on EC2):

```bash
DATABASE_URL=postgresql://postgres:YourPassword@funmagic-db.abc123xyz.us-east-2.rds.amazonaws.com:5432/funmagic
```

### 9.8 Cost Estimate

| Instance Type | vCPU | RAM | Monthly Cost |
|---------------|------|-----|--------------|
| db.t3.micro | 2 | 1 GB | ~$13/month (Free tier eligible) |
| db.t3.small | 2 | 2 GB | ~$26/month |
| db.t3.medium | 2 | 4 GB | ~$52/month |

**Additional costs**:
- Storage: ~$0.115/GB/month (gp3)
- Backup storage: Free up to DB size, then ~$0.095/GB/month
- Data transfer: EC2 ↔ RDS in same region is free

**Recommended starting configuration**:
- **Development/Testing**: `db.t3.micro` (free tier) - ~$13/month
- **Production**: `db.t3.small` with Multi-AZ - ~$52/month

### 9.9 Production Best Practices

1. **Enable Multi-AZ** for high availability (doubles cost but provides failover)
2. **Enable encryption at rest** (free, just check the box)
3. **Enable deletion protection** to prevent accidental deletion
4. **Set up CloudWatch alarms** for CPU, storage, and connections
5. **Use a strong, unique password** (consider AWS Secrets Manager)
6. **Disable public access** and only allow EC2 security group
7. **Enable Performance Insights** for query analysis
8. **Schedule maintenance windows** during low-traffic hours

---

## Step 10: Deploy to AWS EC2 with Docker

This guide uses a **simple EC2 + Docker** approach for easy setup. You can migrate to ECS later if needed.

### 10.1 Prerequisites

- AWS CLI configured
- SSH key pair created in AWS EC2 console
- Docker images ready (we'll build them on EC2)

### 10.2 Create Security Group

1. Go to **EC2** → **Security Groups** → **Create security group**
2. **Name**: `funmagic-ec2-sg`
3. **Description**: Security group for Funmagic EC2 instance
4. **VPC**: Default VPC (or your VPC)
5. **Inbound rules**:

| Type | Port | Source | Description |
|------|------|--------|-------------|
| SSH | 22 | Your IP | SSH access |
| HTTP | 80 | 0.0.0.0/0 | Web traffic |
| HTTPS | 443 | 0.0.0.0/0 | Secure web traffic |

6. **Outbound rules**: Keep default (all traffic allowed)
7. Click **Create security group**

### 10.3 Launch EC2 Instance

1. Go to **EC2** → **Instances** → **Launch instances**
2. **Name**: `funmagic-server`
3. **AMI**: Amazon Linux 2023 (or Ubuntu 22.04 LTS)
4. **Instance type**: `t3.small` (2 vCPU, 2GB RAM) - can run both apps
   - For lower cost: `t3.micro` (1 vCPU, 1GB RAM) - tight but works
5. **Key pair**: Select your SSH key pair
6. **Network settings**:
   - **VPC**: Default VPC
   - **Subnet**: Any public subnet
   - **Auto-assign public IP**: Enable
   - **Security group**: Select `funmagic-ec2-sg`
7. **Storage**: 20 GB gp3 (default is fine)
8. Click **Launch instance**

### 10.4 Allocate Elastic IP (Recommended)

An Elastic IP ensures your server IP doesn't change on reboot:

1. Go to **EC2** → **Elastic IPs** → **Allocate Elastic IP address**
2. Click **Allocate**
3. Select the new IP → **Actions** → **Associate Elastic IP address**
4. **Instance**: Select `funmagic-server`
5. Click **Associate**

> Note the Elastic IP address (e.g., `3.15.xxx.xxx`) - you'll use this for DNS.

### 10.5 Connect to EC2 and Install Docker

```bash
# SSH into your instance
ssh -i your-key.pem ec2-user@YOUR_ELASTIC_IP

# For Ubuntu: ssh -i your-key.pem ubuntu@YOUR_ELASTIC_IP
```

**Install Docker (Amazon Linux 2023)**:

```bash
# Update system
sudo dnf update -y

# Install Docker
sudo dnf install docker -y

# Start Docker and enable on boot
sudo systemctl start docker
sudo systemctl enable docker

# Add current user to docker group (avoid sudo)
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Log out and back in for group changes
exit
```

**Install Docker (Ubuntu)**:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add current user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Log out and back in
exit
```

### 10.6 Set Up Project on EC2

SSH back in and set up your project:

```bash
ssh -i your-key.pem ec2-user@YOUR_ELASTIC_IP

# Create app directory
mkdir -p ~/funmagic
cd ~/funmagic

# Install git
sudo dnf install git -y  # Amazon Linux
# sudo apt install git -y  # Ubuntu
```

### 10.7 Create Docker Files

**Create `docker-compose.yml`** in `~/funmagic`:

```yaml
version: '3.8'

services:
  web:
    build:
      context: .
      dockerfile: Dockerfile.web
    container_name: funmagic-web
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.web

  admin:
    build:
      context: .
      dockerfile: Dockerfile.admin
    container_name: funmagic-admin
    restart: unless-stopped
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.admin

  nginx:
    image: nginx:alpine
    container_name: funmagic-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - web
      - admin
```

**Create `Dockerfile.web`**:

```dockerfile
FROM node:20-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/db/package.json ./packages/db/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/

RUN corepack enable pnpm && pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable pnpm && pnpm --filter web build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME="0.0.0.0"

CMD ["node", "apps/web/server.js"]
```

**Create `Dockerfile.admin`**:

```dockerfile
FROM node:20-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/admin/package.json ./apps/admin/
COPY packages/db/package.json ./packages/db/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/

RUN corepack enable pnpm && pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable pnpm && pnpm --filter admin build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/admin/public ./apps/admin/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/.next/static ./apps/admin/.next/static

USER nextjs
EXPOSE 3001
ENV PORT=3001 HOSTNAME="0.0.0.0"

CMD ["node", "apps/admin/server.js"]
```

**Create `nginx.conf`**:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream web {
        server web:3000;
    }

    upstream admin {
        server admin:3001;
    }

    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name funmagic.ai www.funmagic.ai admin.funmagic.ai;
        return 301 https://$host$request_uri;
    }

    # Main site
    server {
        listen 443 ssl;
        server_name funmagic.ai www.funmagic.ai;

        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;

        location / {
            proxy_pass http://web;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }
    }

    # Admin site
    server {
        listen 443 ssl;
        server_name admin.funmagic.ai;

        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;

        location / {
            proxy_pass http://admin;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }
    }
}
```

### 10.8 Create Environment Files

**Create `.env.web`**:

```bash
DATABASE_URL=postgresql://user:password@your-db-host:5432/funmagic
AWS_REGION=us-east-2
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
S3_WEB_PRIVATE_BUCKET=funmagic-web-users-assets-private
S3_WEB_SHARED_BUCKET=funmagic-web-users-assets-shared
CLOUDFRONT_WEB_PRIVATE_URL=https://dXXXX.cloudfront.net
CLOUDFRONT_WEB_SHARED_URL=https://shared.funmagic.ai
CLOUDFRONT_PUBLIC_URL=https://cdn.funmagic.ai
CLOUDFRONT_KEY_PAIR_ID=K2XXXXXX
CLOUDFRONT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
CLOUDFRONT_SIGNED_URL_EXPIRY=3600
LOGTO_ENDPOINT=https://your-tenant.logto.app/
LOGTO_APP_ID=your-app-id
LOGTO_APP_SECRET=your-app-secret
LOGTO_COOKIE_SECRET=random-32-char-string
LOGTO_BASE_URL=https://funmagic.ai
```

**Create `.env.admin`**:

```bash
DATABASE_URL=postgresql://user:password@your-db-host:5432/funmagic
AWS_REGION=us-east-2
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
S3_ADMIN_ASSETS_BUCKET=funmagic-admin-users-assets
S3_PUBLIC_ASSETS_BUCKET=funmagic-web-public-assets
CLOUDFRONT_ADMIN_PRIVATE_URL=https://dXXXX.cloudfront.net
CLOUDFRONT_PUBLIC_URL=https://cdn.funmagic.ai
CLOUDFRONT_KEY_PAIR_ID=K2XXXXXX
CLOUDFRONT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
CLOUDFRONT_SIGNED_URL_EXPIRY=3600
```

### 10.9 Clone Your Code and Build

**Option A: Clone from Git**

```bash
cd ~/funmagic

# Clone your repository
git clone https://github.com/your-org/magiworld.git .

# Copy your Dockerfiles and configs (if not in repo)
# ... copy files created above ...

# Build and start
docker-compose up -d --build
```

**Option B: Upload from Local**

```bash
# From your local machine
cd /path/to/magiworld
rsync -avz --exclude='node_modules' --exclude='.next' --exclude='.git' \
  -e "ssh -i your-key.pem" \
  . ec2-user@YOUR_ELASTIC_IP:~/funmagic/
```

### 10.10 Set Up SSL with Let's Encrypt

Install Certbot and get free SSL certificates:

```bash
# Install Certbot
sudo dnf install certbot -y  # Amazon Linux
# sudo apt install certbot -y  # Ubuntu

# Stop nginx temporarily
docker-compose stop nginx

# Get certificates (replace with your domain)
sudo certbot certonly --standalone \
  -d funmagic.ai \
  -d www.funmagic.ai \
  -d admin.funmagic.ai \
  --email your-email@example.com \
  --agree-tos

# Copy certificates to your project
mkdir -p ~/funmagic/ssl
sudo cp /etc/letsencrypt/live/funmagic.ai/fullchain.pem ~/funmagic/ssl/
sudo cp /etc/letsencrypt/live/funmagic.ai/privkey.pem ~/funmagic/ssl/
sudo chown -R $USER:$USER ~/funmagic/ssl

# Start nginx again
docker-compose up -d nginx
```

**Set up auto-renewal**:

```bash
# Create renewal script
cat > ~/funmagic/renew-ssl.sh << 'EOF'
#!/bin/bash
cd ~/funmagic
docker-compose stop nginx
sudo certbot renew --quiet
sudo cp /etc/letsencrypt/live/funmagic.ai/fullchain.pem ~/funmagic/ssl/
sudo cp /etc/letsencrypt/live/funmagic.ai/privkey.pem ~/funmagic/ssl/
sudo chown -R $USER:$USER ~/funmagic/ssl
docker-compose start nginx
EOF

chmod +x ~/funmagic/renew-ssl.sh

# Add to crontab (runs monthly)
(crontab -l 2>/dev/null; echo "0 3 1 * * ~/funmagic/renew-ssl.sh") | crontab -
```

### 10.11 Update Cloudflare DNS

Point your domains to the EC2 Elastic IP:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | `@` | `YOUR_ELASTIC_IP` | Proxied (orange) |
| A | `www` | `YOUR_ELASTIC_IP` | Proxied (orange) |
| A | `admin` | `YOUR_ELASTIC_IP` | Proxied (orange) |

> **Note**: Using A records (not CNAME) because we have a static Elastic IP.

### 10.12 Useful Docker Commands

```bash
# View running containers
docker-compose ps

# View logs
docker-compose logs -f web
docker-compose logs -f admin
docker-compose logs -f nginx

# Restart services
docker-compose restart web
docker-compose restart admin

# Rebuild and restart (after code changes)
docker-compose up -d --build

# Stop everything
docker-compose down

# Clean up unused images
docker system prune -a
```

### 10.13 Deploy Updates

When you need to deploy code changes:

```bash
# SSH into server
ssh -i your-key.pem ec2-user@YOUR_ELASTIC_IP
cd ~/funmagic

# Pull latest code (if using git)
git pull origin main

# Or rsync from local (if not using git)
# rsync -avz --exclude='node_modules' -e "ssh -i your-key.pem" . ec2-user@IP:~/funmagic/

# Rebuild and restart
docker-compose up -d --build
```

### 10.14 Cost Estimate

**Minimal EC2 setup**:
- 1x t3.small EC2 (On-Demand): ~$15/month
- Elastic IP (while attached): Free
- 20GB EBS storage: ~$2/month
- Data transfer: ~$5/month
- **Total: ~$22/month**

**Even cheaper options**:
- Use t3.micro: ~$8/month (free tier eligible for 12 months)
- Use Spot instance: 60-90% savings (can be interrupted)
- Reserved instance (1 year): 30-40% savings

### 10.15 Future Migration to ECS

When you're ready to scale, you can migrate to ECS:
1. Push your Docker images to ECR
2. Create ECS task definitions using the same Dockerfiles
3. Set up an Application Load Balancer
4. Create ECS services
5. Update Cloudflare DNS to point to ALB

The Dockerfiles you created here will work directly with ECS

---

## Step 11: Configure Environment Variables

### For Local Development

**Admin App (`apps/admin/.env.local`)**:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/magi-db

# AWS S3 Configuration
AWS_REGION=us-east-2
AWS_ACCESS_KEY_ID=AKIA...your-admin-key
AWS_SECRET_ACCESS_KEY=...your-admin-secret

# Buckets
S3_ADMIN_ASSETS_BUCKET=funmagic-admin-users-assets
S3_PUBLIC_ASSETS_BUCKET=funmagic-web-public-assets

# CloudFront URLs
CLOUDFRONT_ADMIN_PRIVATE_URL=https://d1234admin.cloudfront.net
CLOUDFRONT_PUBLIC_URL=https://cdn.funmagic.ai

# Signed URLs Configuration
CLOUDFRONT_KEY_PAIR_ID=K2XXXXXXXXXXXXXX
CLOUDFRONT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...your-key...==\n-----END PRIVATE KEY-----\n"
CLOUDFRONT_SIGNED_URL_EXPIRY=3600

# AI APIs
FAL_API_KEY=...
OPENAI_API_KEY=...
GOOGLE_GENERATIVE_AI_API_KEY=...
```

**Web App (`apps/web/.env.local`)**:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/magi-db

# AWS S3 Configuration
AWS_REGION=us-east-2
AWS_ACCESS_KEY_ID=AKIA...your-web-key
AWS_SECRET_ACCESS_KEY=...your-web-secret

# Buckets
S3_WEB_PRIVATE_BUCKET=funmagic-web-users-assets-private
S3_WEB_SHARED_BUCKET=funmagic-web-users-assets-shared

# CloudFront URLs
CLOUDFRONT_WEB_PRIVATE_URL=https://d5678private.cloudfront.net
CLOUDFRONT_WEB_SHARED_URL=https://shared.funmagic.ai
CLOUDFRONT_PUBLIC_URL=https://cdn.funmagic.ai

# Signed URLs Configuration
CLOUDFRONT_KEY_PAIR_ID=K2XXXXXXXXXXXXXX
CLOUDFRONT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...your-key...==\n-----END PRIVATE KEY-----\n"
CLOUDFRONT_SIGNED_URL_EXPIRY=3600

# Authentication
LOGTO_ENDPOINT=https://your-tenant.logto.app/
LOGTO_APP_ID=your-app-id
LOGTO_APP_SECRET=your-app-secret
LOGTO_COOKIE_SECRET=random-32-char-string
LOGTO_BASE_URL=https://funmagic.ai
```

### For ECS Production

Use **AWS Secrets Manager** or **Parameter Store** to store sensitive values:

```bash
# Create secrets in Secrets Manager
aws secretsmanager create-secret \
  --name magiworld/web/env \
  --secret-string '{"DATABASE_URL":"...","AWS_ACCESS_KEY_ID":"...","AWS_SECRET_ACCESS_KEY":"..."}'
```

Reference in task definition:
```json
{
  "secrets": [
    {
      "name": "DATABASE_URL",
      "valueFrom": "arn:aws:secretsmanager:us-east-2:123456789:secret:magiworld/web/env:DATABASE_URL::"
    }
  ]
}
```

---

## Step 12: Test the Configuration

### 12.1 Test Admin Library Upload

```bash
# Start admin app
pnpm dev:admin
```

1. Go to `http://localhost:3001/library`
2. Create a folder and upload an image
3. Check AWS Console → S3 → `funmagic-admin-users-assets` → Verify file exists

### 12.2 Test Public Banner Upload

1. Go to Admin → Banners → Add Banner
2. Upload a banner image
3. Check AWS Console → S3 → `funmagic-web-public-assets/banners/main/` → Verify file exists
4. Test public URL: `https://cdn.funmagic.ai/banners/main/your-file.jpg`

### 12.3 Test Web User Upload

```bash
# Start web app
pnpm dev:web
```

1. Log in to the web app
2. Use a tool (e.g., background-remove) to upload an image
3. Check AWS Console → S3 → `funmagic-web-users-assets-private` → Verify file exists

### 12.4 Test Signed URLs

Private bucket URLs without signature should return **403 Forbidden**:
```
https://d1234admin.cloudfront.net/path/to/file.jpg  → 403 Forbidden
```

Signed URLs should work:
```
https://d1234admin.cloudfront.net/path/to/file.jpg?Expires=...&Signature=...&Key-Pair-Id=...  → 200 OK
```

### 12.5 Test EC2 Deployment

```bash
# SSH into your server
ssh -i your-key.pem ec2-user@YOUR_ELASTIC_IP
cd ~/funmagic

# Check running containers
docker-compose ps

# View logs
docker-compose logs -f web
docker-compose logs -f admin

# Test from browser
# https://funmagic.ai - should show web app
# https://admin.funmagic.ai - should show admin app
```

---

## Quick Checklist

| Step | Task | Status |
|------|------|--------|
| 1.1 | Create `funmagic-admin-users-assets` bucket (private) | ⬜ |
| 1.2 | Create `funmagic-web-public-assets` bucket (public) | ⬜ |
| 1.3 | Create `funmagic-web-users-assets-private` bucket (private) | ⬜ |
| 1.4 | Create `funmagic-web-users-assets-shared` bucket (public) | ⬜ |
| 2.1 | Add public bucket policy to `funmagic-web-public-assets` | ⬜ |
| 2.2 | Add public bucket policy to `funmagic-web-users-assets-shared` | ⬜ |
| 3 | Configure CORS on all 4 buckets | ⬜ |
| 4.1 | Create `funmagic-admin-s3-policy` IAM policy | ⬜ |
| 4.2 | Create `funmagic-admin-app` IAM user | ⬜ |
| 4.3 | Create access keys for admin user | ⬜ |
| 4.4 | Create `funmagic-web-s3-policy` IAM policy | ⬜ |
| 4.5 | Create `funmagic-web-app` IAM user + access keys | ⬜ |
| 4.6 | Delete root user access keys (if applicable) | ⬜ |
| 5.1 | Create CloudFront for `funmagic-admin-users-assets` (with OAC) | ⬜ |
| 5.2 | Create CloudFront for `funmagic-web-public-assets` (public) | ⬜ |
| 5.3 | Create CloudFront for `funmagic-web-users-assets-private` (with OAC) | ⬜ |
| 5.4 | Create CloudFront for `funmagic-web-users-assets-shared` (public) | ⬜ |
| 6.1 | Create CloudFront key pair for signed URLs | ⬜ |
| 6.2 | Create key group for signed URLs | ⬜ |
| 6.3 | Configure private distributions to require signed URLs | ⬜ |
| 6.4 | Add private key to `.env.local` | ⬜ |
| 7 | Set up lifecycle policies | ⬜ |
| 8.1a | Add domain to Cloudflare | ⬜ |
| 8.1b | Update nameservers in GoDaddy | ⬜ |
| 8.1c | Verify nameservers propagated | ⬜ |
| 8.2 | Configure Google Workspace email records (MX, SPF, DKIM) | ⬜ |
| 8.3 | Configure DNS for CloudFront distributions | ⬜ |
| 8.4 | Configure DNS for EC2 | ⬜ |
| 9.1 | Create RDS security group (`funmagic-rds-sg`) | ⬜ |
| 9.2 | Create RDS PostgreSQL instance (`funmagic-db`) | ⬜ |
| 9.3 | Get RDS endpoint and build connection string | ⬜ |
| 9.4 | Test database connection | ⬜ |
| 9.5 | Run Drizzle migrations to initialize schema (`pnpm db:push`) | ⬜ |
| 10.1 | Create EC2 security group | ⬜ |
| 10.2 | Launch EC2 instance | ⬜ |
| 10.3 | Allocate Elastic IP | ⬜ |
| 10.4 | Install Docker on EC2 | ⬜ |
| 10.5 | Create Docker Compose and Dockerfiles | ⬜ |
| 10.6 | Clone code and build containers | ⬜ |
| 10.7 | Set up SSL with Let's Encrypt | ⬜ |
| 10.8 | Update Cloudflare DNS to EC2 IP | ⬜ |
| 11 | Configure `.env.local` files for both apps | ⬜ |
| 12.1 | Test admin library upload | ⬜ |
| 12.2 | Test public banner upload | ⬜ |
| 12.3 | Test web user upload | ⬜ |
| 12.4 | Test signed URLs work correctly | ⬜ |
| 12.5 | Test EC2 deployment | ⬜ |
| 12.6 | Test database connection from apps | ⬜ |

---

## Troubleshooting

### "Access Denied" when uploading

1. Verify IAM policy is attached to the user
2. Check bucket name matches in policy and `.env.local`
3. Verify access key ID and secret are correct
4. **If using root credentials**: Create IAM users instead (Step 4)

### CORS errors in browser

1. Verify CORS is configured on all buckets
2. Check `AllowedOrigins` includes your domain
3. Clear browser cache and retry

### CloudFront not serving updated files

1. Files use cache-busted filenames (timestamp in name)
2. If needed, create invalidation: CloudFront → Distribution → Invalidations → Create → Path: `/*`

### Signed URLs returning 403

1. Verify key group is attached to distribution behavior
2. Check distribution status is "Deployed"
3. Verify `CLOUDFRONT_KEY_PAIR_ID` matches the key ID in AWS
4. Check private key format (newlines escaped as `\n`)

### Files not appearing in S3

1. Check browser console for upload errors
2. Verify AWS credentials are set in `.env.local`
3. Restart dev server after changing env vars

### Cloudflare SSL errors

1. Ensure SSL/TLS mode is set to "Full (strict)"
2. Verify ACM certificates are validated
3. Check that CloudFront has the certificate attached

### Cloudflare nameserver not propagating (GoDaddy)

1. **Verify nameservers in GoDaddy**:
   - Go to GoDaddy → My Products → DNS → Nameservers
   - Confirm it shows Cloudflare nameservers (not GoDaddy defaults)

2. **Check DNSSEC**:
   - If DNSSEC was enabled in GoDaddy, it blocks nameserver changes
   - Disable DNSSEC in GoDaddy → wait 24-48 hours → then change nameservers

3. **Check propagation status**:
   - Use [whatsmydns.net](https://www.whatsmydns.net/) to check NS record propagation
   - Enter your domain and select "NS" record type

4. **Wait longer**:
   - Propagation can take up to 48 hours in some cases
   - Most complete within 1-6 hours

5. **Force re-check in Cloudflare**:
   - Go to Cloudflare Dashboard → Your domain → Overview
   - Click "Check nameservers" to force a re-check

### Domain still pointing to old hosting

1. Clear your local DNS cache:
   ```bash
   # macOS
   sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder

   # Windows
   ipconfig /flushdns
   ```

2. Try accessing from a different network (mobile data)

3. Check if you have any DNS overrides in `/etc/hosts`

### Email stopped working after Cloudflare migration

1. **Check MX records exist in Cloudflare**:
   - Go to Cloudflare → DNS → Records
   - Look for MX records pointing to Google servers
   - If missing, add them (see Step 8.2)

2. **Verify MX records propagated**:
   - Use [MXToolbox](https://mxtoolbox.com/SuperTool.aspx?action=mx:funmagic.ai)
   - Should show Google's mail servers

3. **Check SPF record**:
   - Look for TXT record with `v=spf1 include:_spf.google.com ~all`
   - Missing SPF = emails may go to spam

4. **Test email delivery**:
   - Send test email from external account (Gmail personal, Yahoo, etc.)
   - Check spam folder
   - Send email FROM your domain to verify sending works

5. **Common mistakes**:
   - MX record name should be `@` not `funmagic.ai`
   - MX records cannot be proxied (must be gray cloud / DNS only)
   - Priority numbers matter (1 is highest priority)

### Emails going to spam after migration

1. Verify SPF record exists: `v=spf1 include:_spf.google.com ~all`
2. Set up DKIM in Google Admin Console and add the TXT record
3. Add DMARC record: `v=DMARC1; p=none; rua=mailto:admin@funmagic.ai`
4. Wait 24-48 hours for DNS propagation

### Docker containers not starting on EC2

1. Check container logs: `docker-compose logs -f web`
2. Verify environment files exist: `.env.web` and `.env.admin`
3. Check Docker is running: `sudo systemctl status docker`
4. Verify ports aren't in use: `sudo lsof -i :3000` and `sudo lsof -i :3001`

### Nginx returning 502 Bad Gateway

1. Check if app containers are running: `docker-compose ps`
2. Verify containers are healthy: `docker-compose logs web`
3. Check nginx can reach containers: `docker exec funmagic-nginx ping web`
4. Restart services: `docker-compose restart`

### Can't SSH into EC2

1. Verify security group has port 22 open for your IP
2. Check you're using correct key file: `ssh -i your-key.pem ec2-user@IP`
3. Verify Elastic IP is associated with instance
4. Check instance is running in EC2 console

### Can't connect to RDS from EC2

1. **Verify security groups**:
   - `funmagic-rds-sg` must allow port 5432 from `funmagic-ec2-sg`
   - Check both security groups are in the same VPC

2. **Check RDS endpoint**:
   - Go to RDS → Databases → `funmagic-db`
   - Copy the correct endpoint (not the instance ID)

3. **Test connection**:
   ```bash
   # From EC2
   psql "postgresql://postgres:YourPassword@your-endpoint:5432/funmagic"
   ```

4. **Check RDS status**:
   - RDS must be in "Available" state
   - Check for pending modifications or maintenance

5. **Verify DATABASE_URL format**:
   ```
   postgresql://USERNAME:PASSWORD@ENDPOINT:5432/DATABASE
   ```
   - Special characters in password must be URL-encoded

### Can't connect to RDS from local machine

1. **Enable public access** on RDS (if needed for development):
   - RDS → Databases → `funmagic-db` → Modify
   - Set "Public access" to Yes
   - Apply immediately

2. **Add your IP to security group**:
   - EC2 → Security Groups → `funmagic-rds-sg`
   - Add inbound rule: PostgreSQL, 5432, Your IP

3. **Check if RDS is in public subnet**:
   - RDS needs to be in a subnet with internet gateway route

### Drizzle migrations failing

1. **Connection timeout**:
   - Check DATABASE_URL is correct
   - Verify security group allows connection
   - Ensure RDS instance is in "Available" state

2. **Permission denied**:
   - Ensure you're using the master user credentials
   - Check database name exists

3. **Run migrations manually**:
   ```bash
   cd packages/db
   pnpm db:push
   ```

4. **View database with Drizzle Studio**:
   ```bash
   cd packages/db
   pnpm db:studio
   ```

---

## Security Best Practices

1. **Never use root credentials** in applications - create IAM users
2. **Never commit AWS credentials** to git
3. **Use separate IAM users** for each app (admin vs web)
4. **Restrict bucket policies** to minimum required permissions
5. **Enable S3 versioning** for important buckets (optional)
6. **Set up CloudTrail** for audit logging (production)
7. **Rotate access keys** periodically
8. **Use Secrets Manager** for production credentials
9. **Enable MFA** on AWS root account and IAM users
10. **Use different key pairs** for admin and web signed URLs (optional extra security)

---

## Domain Structure Summary

| Domain | Service | Notes |
|--------|---------|-------|
| `funmagic.ai` | EC2 (Web App) | Main user-facing site |
| `www.funmagic.ai` | EC2 (Web App) | Redirect or alias |
| `admin.funmagic.ai` | EC2 (Admin App) | Internal admin panel |
| `cdn.funmagic.ai` | CloudFront (funmagic-web-public-assets) | Public static assets |
| `shared.funmagic.ai` | CloudFront (funmagic-web-users-assets-shared) | User shared files |
| *(CF domain)* | CloudFront (funmagic-admin-users-assets) | Private, no custom domain |
| *(CF domain)* | CloudFront (funmagic-web-users-assets-private) | Private, no custom domain |
