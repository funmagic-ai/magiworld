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

2. **Add to `.env.local`** (see Step 11)

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

