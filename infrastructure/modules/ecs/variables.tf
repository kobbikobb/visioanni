variable "name" {
  description = "Name prefix for resources"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID where resources will be deployed"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs for ECS service"
  type        = list(string)
}

variable "cpu" {
  description = "CPU units for the task"
  type        = string
  default     = "256"
}

variable "memory" {
  description = "Memory for the task"
  type        = string
  default     = "512"
}

variable "container_name" {
  description = "Name of the container"
  type        = string
}

variable "container_image" {
  description = "Container image to deploy"
  type        = string
}

variable "container_port" {
  description = "Container port to expose"
  type        = number
  default     = 3000
}

variable "execution_role_arn" {
  description = "ARN of the task execution role"
  type        = string
}

variable "desired_count" {
  description = "Number of desired tasks"
  type        = number
  default     = 1
}

variable "env_vars" {
  description = "Environment variables for the ECS container"
  type        = map(string)
  sensitive   = true
}

variable "alb_sg_id" {
  description = "ALB Security Group Id"
  type        = string
}

variable "target_group_arn" {
  description = "The ALB target group arn"
  type        = string
}
