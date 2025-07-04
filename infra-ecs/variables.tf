variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "container_port" {
  description = "Container port to expose"
  type        = number
  default     = 3000
}

variable "env_vars" {
  description = "App env vars passed to the ECS container"
  type        = map(string)
  sensitive   = true
}
