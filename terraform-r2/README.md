# Terraform R2

Terraform configuration for managing Cloudflare R2 storage buckets with lifecycle policies and CORS configuration using the AWS provider.

## Services

This project uses Terraform to manage cloud infrastructure, not containerized services.

## Configuration

The configuration creates:
- **S3 Bucket**: `<org>-test` bucket on Cloudflare R2
- **CORS Configuration**: Allows GET requests from any origin
- **Lifecycle Rules**: 
  - Expires objects after 1 day
  - Aborts incomplete multipart uploads after 1 day

## Usage

```bash
terraform init
terraform plan
terraform apply
```

## Configuration

Required variables (set in `terraform.tfvars` or environment):
- `access_key`: Cloudflare R2 API token with R2 permissions
- `secret_key`: Cloudflare R2 secret key
- `account_id`: Cloudflare account ID

The configuration uses the AWS provider with custom R2 endpoints to manage Cloudflare R2 storage as if it were AWS S3.