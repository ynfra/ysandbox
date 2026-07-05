# Terraform R2

Terraform configuration for managing Cloudflare R2 storage buckets via the AWS
provider pointed at an R2 S3-compatible endpoint. Creates a bucket with a CORS
rule and lifecycle policies. This is a Terraform-only stack — no Docker Compose.

## Usage

```bash
terraform init && terraform apply
```

`terraform init` downloads the AWS provider; `terraform apply` creates the
resources against Cloudflare R2. Provide credentials via `terraform.tfvars` or
environment variables (see Configuration) before applying.

## Managed resources

Not a container stack — Terraform manages these resources against R2:

| Resource | Description |
|----------|-------------|
| `aws_s3_bucket.default` | R2 bucket (`<org>-test`) via the `us-east-1` AWS provider with a custom R2 `s3` endpoint |
| `aws_s3_bucket_cors_configuration.default` | CORS rule — allows `GET` from any origin |
| `aws_s3_bucket_lifecycle_configuration.default` | Expires objects after 1 day; aborts incomplete multipart uploads after 1 day |

## Configuration

Required variables (set in `terraform.tfvars` or as `TF_VAR_*` env vars):

| Variable | Default | Notes |
|----------|---------|-------|
| `access_key` | — | Cloudflare R2 API token / access key — **change**, secret |
| `secret_key` | — | Cloudflare R2 secret key — **change**, secret |
| `account_id` | — | Cloudflare account ID (used to build the R2 endpoint `https://<account_id>.r2.cloudflarestorage.com`) |

The provider sets `skip_credentials_validation`, `skip_region_validation`, and
`skip_requesting_account_id` so the AWS SDK works against the R2 endpoint.

## Volumes

None — Terraform state (`terraform.tfstate`, local by default).

## Observability

| Check | Endpoint / Command |
|-------|--------------------|
| Planned changes | `terraform plan` |
| Current state | `terraform show` |
| Resource list | `terraform state list` |

## Resources

- Terraform AWS provider: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- Cloudflare R2 S3 API: https://developers.cloudflare.com/r2/api/s3/
