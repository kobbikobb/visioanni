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

module "ecs" {
  source = "./modules/ecs"

  name               = "visioanni"
  vpc_id             = module.vpc.vpc_id
  subnet_ids         = module.vpc.public_subnet_ids
  cpu                = "256"
  memory             = "512"
  container_name     = "visioanni"
  container_image    = module.ecr.repository_uri
  execution_role_arn = module.iam.ecs_execution_role_arn
  desired_count      = 1
}
