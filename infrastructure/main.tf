module "ecr" {
  source          = "./modules/ecr"
  repository_name = "visioanni"
}

module "iam" {
  source              = "./modules/iam"
  execution_role_name = "ecsTaskExecutionRole"
}

module "vpc" {
  source              = "./modules/vpc"
  vpc_cidr            = "10.0.0.0/16"
  public_subnet_cidrs = ["10.0.1.0/24", "10.0.2.0/24"]
}

module "alb" {
  source = "./modules/alb"

  name              = "visioanni-alb"
  vpc_id            = module.vpc.vpc_id
  subnets           = module.vpc.public_subnet_ids
  container_port    = var.container_port
  health_check_path = "health"
}

module "ecs" {
  source = "./modules/ecs"

  name               = "visioanni"
  vpc_id             = module.vpc.vpc_id
  subnet_ids         = module.vpc.public_subnet_ids
  cpu                = "256"
  memory             = "512"
  container_name     = "visioanni"
  container_image    = module.ecr.repository_uri
  container_port     = var.container_port
  execution_role_arn = module.iam.ecs_execution_role_arn
  desired_count      = 1
  alb_sg_id          = module.alb.alb_sg_id
  target_group_arn   = module.alb.target_group_arn
  env_vars           = var.env_vars
}

