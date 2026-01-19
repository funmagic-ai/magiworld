# Prerequisites

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
