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

