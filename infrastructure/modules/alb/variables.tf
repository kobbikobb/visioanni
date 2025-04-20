variable "name" {
  description = "Name of the ALB"
  type        = string
}

variable "subnets" {
  description = "Subnets to launch the ALB into"
  type        = list(string)
}

variable "vpc_id" {
  description = "VPC ID to launch the ALB in"
  type        = string
}

variable "port" {
  description = "Port to forward traffic to"
  type        = number
  default     = 80
}

variable "container_port" {
  description = "Port for containers"
  type        = number
  default     = 3000
}

variable "protocol" {
  description = "Protocol for the listener"
  type        = string
  default     = "HTTP"
}

variable "health_check_path" {
  description = "Health check path for the target group"
  type        = string
  default     = "/"
}
