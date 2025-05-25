# Infrastructure for Visioanni

- Note the module structure
- Public ECR Repository

## Plan / Apply

- create `terraform.tfvars`

```
env_vars = {
  KINDE_ISSUER_URL          = ""
  KINDE_CLIENT_ID           = ""
  KINDE_CLIENT_SECRET       = ""
  KINDE_SITE_URL            = ""
  KINDE_LOGOUT_REDIRECT_URI = ""
  KINDE_DOMAIN              = ""
  KINDE_REDIRECT_URI        = ""
  DATABASE_URL              = ""
}
```

- terrafrom init
- terraform plan
- terraform apply

## Useful

- terraform plan
- terraform apply
- terraform destory
