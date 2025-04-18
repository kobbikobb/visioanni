output "ecr_repository_url" {
  description = "The URL of the public repository"
  value       = module.ecr.repository_uri
}

output "ecs_execution_role_arn" {
  description = "ARN of the ECS execution role"
  value       = module.iam.ecs_execution_role_arn
}
