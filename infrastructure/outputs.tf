output "ecr_repository_url" {
  description = "The URL of the public repository"
  value       = module.ecr.repository_uri
}
