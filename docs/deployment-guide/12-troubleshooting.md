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

### Can't connect to Redis from EC2

1. **Verify security groups**:
   - `funmagic-redis-sg` must allow port 6379 from `funmagic-ec2-sg`
   - Check both security groups are in the same VPC

2. **Check ElastiCache endpoint**:
   - Go to ElastiCache → Redis caches → `funmagic-redis`
   - Copy the Primary endpoint (not the cluster ID)

3. **Test connection**:
   ```bash
   # From EC2 (without TLS)
   redis-cli -h funmagic-redis.abc123.use2.cache.amazonaws.com -p 6379 ping

   # With TLS
   redis-cli -h funmagic-redis.abc123.use2.cache.amazonaws.com -p 6379 --tls ping
   ```

4. **Check REDIS_URL format**:
   - Without TLS: `redis://ENDPOINT:6379`
   - With TLS: `rediss://ENDPOINT:6379` (note the double 's')

5. **Verify ElastiCache status**:
   - Cluster must be in "Available" state
   - Check for pending modifications

### Worker not processing jobs

1. **Check worker container is running**:
   ```bash
   docker-compose ps worker
   docker-compose logs -f worker
   ```

2. **Verify Redis connection**:
   - Check REDIS_URL environment variable is set
   - Test Redis connection from worker container

3. **Check for queued jobs**:
   ```bash
   # From EC2 or container with redis-cli
   redis-cli -h YOUR_REDIS_HOST KEYS "bull:*"
   redis-cli -h YOUR_REDIS_HOST LLEN "bull:default:wait"
   ```

4. **Check AI provider API keys**:
   - Verify FAL_API_KEY, OPENAI_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY are set
   - Check provider credentials in database are valid

5. **View dead letter queue**:
   - Check `dead_letter_tasks` table for failed jobs
   - Admin panel → System → Dead Letters

### Task stuck in pending/processing state

1. **Check worker logs**:
   ```bash
   docker-compose logs -f worker
   ```

2. **Verify job in Redis**:
   ```bash
   redis-cli -h YOUR_REDIS_HOST LRANGE "bull:default:active" 0 -1
   ```

3. **Check circuit breaker state**:
   - Provider may be in "open" state after multiple failures
   - Check `providers` table `circuitState` column
   - Wait 30 seconds for half-open state

4. **Force retry**:
   - Check dead letter queue for the task
   - Use admin panel to reprocess failed tasks

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
